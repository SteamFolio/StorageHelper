# Storage Helper
### Package which helps you add and retrieve items from storage containers

# Example:

```js
const storageHelper = new StorageHelper();

storageHelper.on('ready', function () {
	storageHelper.addItemsToStorageUnit("StorageUnitName", "Breakout Case");
});

storageHelper.login("username", "password");
```


