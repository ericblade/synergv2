enyo.kind({
	name: "enyo.PreferencesService",
	kind: enyo.Component,
	events: {
		onFetchPreferences: ""
	},
    components: [
        { name: "getPrefs", kind: "PalmService", service: "palm://com.palm.systemservice/", method: "getPreferences", onSuccess: "prefsReceived" },
        { name: "setPrefs", kind: "PalmService", service: "palm://com.palm.systemservice/", method: "setPreferences", onSuccess: "prefsSet" },
    ],
	updatePreferences: function(inPreferences) {
        this.$.setPrefs.call(inPreferences);
	},
	fetchPreferences: function(inKeys, inSubscribe) {
        this.$.getPrefs.call({ keys: inKeys, subscribe: inSubscribe }, { subscribe: inSubscribe });
	},
    prefsReceived: function(inSender, inResponse) {
        this.doFetchPreferences(inResponse);
    }
});
