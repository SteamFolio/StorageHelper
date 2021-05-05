# Storage Helper
Package which helps you add and retrieve items from storage containers

## Requirements
This package uses:
- steam-user (for logging in to steam)
- globaloffensive (for interacting with the csgo network)
- axios (for requesting the user's csgo inventory)

To install:
```
npm install
```

### Example for adding Prisma cases to a storage unit named "StorageUnit1":

```js
const {StorageHelper} = require('./index');

const helper = new StorageHelper();
helper.login("username", "password");

helper.on('ready', function () {
	// To deposit all Prisma Cases into "StorageUnit1"
	helper.addItemsToStorageUnit("StorageUnit1", "Prisma Case");

	// Or the following to only deposit a maximum of 5 Prisma Cases:
	// helper.addItemsToStorageUnit("StorageUnit1", "Prisma Case", 5);
});
```

### Example for withdrawing items from a storage unit named "StorageUnit1":

```js
const {StorageHelper} = require('./index');

const helper = new StorageHelper();
helper.login("username", "password");

helper.on('ready', function () {
	// To withdraw all items from "StorageUnit1"
	helper.getItemsFromStorageUnit("StorageUnit1");

	// Or the following to only withdraw a maximum of 5 items from "StorageUnit1:
	// helper.getItemsFromStorageUnit("StorageUnit1", 5);
});
```



