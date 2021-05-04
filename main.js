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
	 * Async function to add items of one type to storage unit
	 * @param {string} storageUnitName
	 * @param {string} itemName
	 */
	addItemsToStorageUnit = async (storageUnitName, itemName) => {
		if (!this._isLoggedIn) {
			return console.log("Not logged in");
		}
		else if (!this._csgo.haveGCSession) {
			return console.log("Not connected to GC");
		}

		const steamId = this._user.steamID.getSteamID64();
		await this._fetchInventory(steamId);

		if (this._inventory) {
			const storageUnit = this._getStorageUnitByName(storageUnitName);
			const assetIds = this._getAssetidsForName(itemName);
			const maxItems = 1000 - storageUnit.currentQuantity;

			for (let i = 0; i <= maxItems; i++) {
				this._csgo.addToCasket(storageUnit.id, assetIds[i]);
			}
		}

		else {
			console.log("Failed to fetch inventory");
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
		const storageUnits = descriptions.filter(item => item.name === "Storage Unit");

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

			return assets.filter(asset => asset.classid === classId).map(function (obj) {
				return parseInt(obj.assetid);
			});
		}

		return [];
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
		});
	};

}