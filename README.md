# Storage Helper
Package which helps you add and retrieve items from storage containers

### Example for adding Prisma cases to a storage unit named "StorageUnit1":

```js
const {StorageHelper} = require('./index');

const helper = new StorageHelper();
helper.login("username", "password");

helper.on('ready', function () {
	helper.addItemsToStorageUnit("StorageUnit1", "Prisma Case");

	// Or the following to only deposit a maximum of 5 Prisma Cases:
	// helper.addItemsToStorageUnit("StorageUnit1", "Prisma Case", 5);
});
```

### Example for withdrawing 5 items from a storage unit named "StorageUnit1":

```js
const {StorageHelper} = require('./index');

const helper = new StorageHelper();
helper.login("username", "password");

helper.on('ready', function () {
	helper.getItemsFromStorageUnit("StorageUnit1", 5);
});
```



