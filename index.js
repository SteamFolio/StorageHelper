const axios = require('axios');
const EventEmitter = require('events').EventEmitter;

const SteamUser = require('steam-user');
const GlobalOffensive = require('globaloffensive');

/**
 * Contains the unique id and current quantity of the storage unit
 */
class StorageUnit {
	constructor(id, currentQuantity) {
		this.id = id;
		this.currentQuantity = currentQuantity;
	}
}

class StorageHelper extends EventEmitter {
	constructor() {
		super();
		this._isLoggedIn = false;
		this._inventory = {};
		this._user = new SteamUser();
		this._csgo = new GlobalOffensive(this._user);
		this._registerErrorHandling();
		this._registerItemCustomizationNotificationHandling();
	}

	/**
	 * Login to Steam and connect to GC
	 * @param {string} username
	 * @param {string} password
	 */
	login = (username, password) => {
		const that = this;
		this._user.on('loggedOn', function () {
			console.log('Logged into Steam');
			that._isLoggedIn = true;
			that._user.gamesPlayed([730]);
		});

		this._csgo.on('connectedToGC', function () {
			that.emit('ready');
		});

		this._user.logOn({
			'accountName': username,
			'password': password
		});
	};

	/**
	 * Async function to add items of one type to a storage unit
	 * @param {string} storageUnitName Name of the storage unit, defined by the user
	 * @param {string} itemName Full name of the item which will be added to the storage unit
	 * @param {number} max Amount of items to add, default will be used if this number exceeds the available space
	 */
	addItemsToStorageUnit = async (storageUnitName, itemName, max = -1) => {
		const storageUnitMaxCapacity = 1000;

		if(!this._isReady()){
			return;
		}

		const steamId = this._user.steamID.getSteamID64();
		await this._fetchInventory(steamId);

		if (this._inventory) {
			const storageUnit = this._getStorageUnitByName(storageUnitName);
			if (!storageUnit) {
				return;
			}

			const assetIds = this._getAssetidsForName(itemName);
			let maxItems = storageUnitMaxCapacity - storageUnit.currentQuantity;

			if (assetIds.length === 0) {
				return console.log(`No items found for given name ${itemName}`);
			}

			if (assetIds.length < maxItems) {
				maxItems = assetIds.length;
			}

			if (max > 0 && max < maxItems) {
				maxItems = max;
			}

			for (let i = 0; i < maxItems; i++) {
				this._csgo.addToCasket(storageUnit.id, assetIds[i]);
				await this._sleep();
			}
		}

		else {
			console.log('Failed to fetch inventory');
		}
	};

	/**
	 * Async function to retrieve items of one type from a storage unit
	 * @param {string} storageUnitName Name of the storage unit, defined by the user
	 * @param {number} max Amount of items to retrieve, default will be used if this number exceeds the amount of items in storage unit
	 */
	getItemsFromStorageUnit = async (storageUnitName, max = -1) => {
		if(!this._isReady()){
			return;
		}

		const steamId = this._user.steamID.getSteamID64();
		await this._fetchInventory(steamId);

		if (this._inventory) {

			const storageUnit = this._getStorageUnitByName(storageUnitName);
			if (!storageUnit) {
				return;
			}

			const assetIds = this._getAssetidsFromStorageUnit(storageUnit.id);
			let maxItems = assetIds.length;

			if (assetIds.length === 0) {
				return console.log(`No items found in storage unit`);
			}

			if (max > 0 && max < maxItems) {
				maxItems = max;
			}

			for (let i = 0; i < maxItems; i++) {
				this._csgo.removeFromCasket(storageUnit.id, assetIds[i]);
				await this._sleep();
			}
		}
	};

	/**
	 * Fetches the user's inventory from Steam
	 * @param {string} steamId
	 * @private
	 */
	_fetchInventory = async (steamId) => {
		const url = `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=1000`;
		try {
			const response = await axios.get(url);

			if (response.data && response.data.assets) {
				this._inventory = response.data;
			}
		} catch (error) {
			console.log(error);
		}
	};

	/**
	 * Returns storage unit information from the user's inventory for the given name
	 * @param {string} name
	 * @private
	 */
	_getStorageUnitByName = (name) => {
		const inventory = this._inventory;
		const descriptions = inventory.descriptions;
		const assets = inventory.assets;
		const storageUnits = descriptions.filter(item => item.name === 'Storage Unit');

		if (storageUnits && storageUnits.length > 0) {
			const nameTagTemplate = `Name Tag: ''${name}''`;
			const storageUnit = storageUnits.find(item => item.fraudwarnings[0] === nameTagTemplate);

			if (storageUnit) {
				const classId = storageUnit.classid;
				const storageUnitAsset = assets.find(asset => asset.classid === classId);

				let currentQuantity = storageUnit.descriptions[2];
				currentQuantity = currentQuantity.value.replace('Number of Items: ', '');
				return new StorageUnit(parseInt(storageUnitAsset.assetid), parseInt(currentQuantity));
			}
		}
		else {
			console.log(`No storage unit found with name ${name}`);
		}
	};

	/**
	 * Returns an array with assetids for all items which match the given name
	 * @param {string} name
	 * @private
	 */
	_getAssetidsForName = (name) => {
		const inventory = this._inventory;
		const assets = inventory.assets;
		const descriptions = inventory.descriptions;
		let item = descriptions.find(item => item.name === name);

		if (item) {
			const classId = item.classid;

			return assets.filter(asset => asset.classid === classId && !asset.hasOwnProperty('casket_id')).map(function (obj) {
				return parseInt(obj.assetid);
			});
		}

		return [];
	};

	/**
	 * Returns an array with assetids for all items in a storage unit
	 * @param {Number} storageUnitId
	 * @private
	 */
	_getAssetidsFromStorageUnit = (storageUnitId) => {
		let inventory = [];
		this._csgo.getCasketContents(storageUnitId, (err, items) => {
			if (err) {
				console.log(err.message);
				return [];
			}
			else {
				inventory = items;
			}
		});

		return inventory.map(function (obj) {
			return parseInt(obj.id);
		});
	};

	/**
	 * Logs errors returned from the SteamUser object
	 * @private
	 */
	_registerErrorHandling = () => {
		this._user.on('error', function (e) {
			console.log(e);
		});
	};

	/**
	 * Deals with events related to storage units
	 * @private
	 */
	_registerItemCustomizationNotificationHandling = () => {
		this._csgo.on('itemCustomizationNotification', (itemIds, notificationType) => {
			if (notificationType === GlobalOffensive.ItemCustomizationNotification.CasketInvFull) {
				console.log(`Storage unit ${itemIds[0]} is full`);
			}

			if (notificationType === GlobalOffensive.ItemCustomizationNotification.CasketAdded) {
				console.log('Item added to Storage unit');
			}

			if (notificationType === GlobalOffensive.ItemCustomizationNotification.CasketRemoved) {
				console.log('Item removed from Storage unit');
			}
		});
	};

	/**
	 * Returns Promise which is resolved after the timeout defined in ms has passed
	 * @private
	 */
	_sleep = () => {
		return new Promise(resolve => setTimeout(resolve, 500));
	};

	/**
	 * Returns boolean which indicates if the user is logged in and has a connection to GC
	 * @private
	 */
	_isReady = () =>{
		if (!this._isLoggedIn) {
			console.log('Not logged in');
		}
		else if (!this._csgo.haveGCSession) {
			console.log('Not connected to GC');
		}

		return this._isLoggedIn && this._csgo.haveGCSession;
	};
}

module.exports.StorageHelper = StorageHelper;