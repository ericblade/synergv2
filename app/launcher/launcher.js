enyo.kind({
	name: "SynergyLauncher",
	kind: enyo.Component,

	components: [
		{ kind: "ApplicationEvents", /*onApplicationRelaunch: "applicationRelaunchHandler",*/ onWindowParamsChange: "applicationRelaunchHandler" },
        { name: "SyncAllAccounts", kind: "PalmService", service: "palm://com.ericblade.synergv.service/", method: "syncAllAccounts" },
    ],
    
	applicationRelaunchHandler: function(inSender) {
		this.log(enyo.windowParams);
		if(!this.processWindowParams(enyo.windowParams))
            this.openCard(enyo.windowParams);
	},
    startup: function() {
        this.log(enyo.windowParams);
        this.applicationRelaunchHandler();
    },
    processWindowParams: function(params) {
        switch(params.cmd) {
            case "syncAllAccounts":
                this.$.SyncAllAccounts.call({ });
                break;
            case "noWindow":
                return true;
            default: // let the app deal with anything else
                return false;
        }
        if(params.sendDataToShare)
        {
            return false; // let relaunchHandler pass them through
        }
        return false;
    },
    openCard: function(windowParams) {
        var path = enyo.fetchAppRootPath() + "/mainApp/index.html";
        
        this.mainApp = enyo.windows.activate(path, "synergvapp", windowParams);
    }
});