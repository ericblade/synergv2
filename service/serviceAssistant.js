/* A ServiceAssistant is apparently created when a service is initially started.
 * I think this might be useful for dealing with some kind of persistent connections? perhaps.
 */

serviceAssistant = Class.create({
    getGVClientForAccount: function(accountId)
    {
        var future = new Future;
        var auth, rnrse, username, password;
        if(!this.GVClients)
            this.GVClients = { };
            
        var prefsFuture = PalmCall.call("palm://com.palm.systemservice/", "getPreferences",
                                    {
                                        keys: [ "synergvSyncOutgoing", "synergvMarkReadOnSync", "synergvSyncTime" ]
                                    });
        prefsFuture.then(future.callback(this, function(f) {
            this.syncOutgoing = !!f.result.synergvSyncOutgoing;
            this.markReadOnSync = !!f.result.synergvMarkReadOnSync;
            this.syncTime = f.result.synergvSyncTime || 5;
            this.syncTime = this.syncTime * 60;
            console.log("syncOutgoing=" + this.syncOutgoing + " markReadOnSync=" + this.markReadOnSync + " syncTime=" + this.syncTime);   
        }));
        if(accountId === undefined) {
            console.log("getGVClientForAccount received no accountId!!! wtf?");
            future.result = { returnValue: false };
            return future;
        }
        if(this.GVClients[accountId])
        {
            console.log("returning gvclient from pool for " + this.GVClients[accountId].config.email);
            future.result = { client: this.GVClients[accountId], returnValue: true };
            return future;
        }
        console.log("retrieving new gvclient");
        future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
                                  { "keyname": "GVAuth:" + accountId }).
            then(function(f) {
                auth = Base64.decode(f.result.keydata);
            }));
        future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
                                  { "keyname": "GVRNRSE:" + accountId }).
            then(function(f) {
                rnrse = Base64.decode(f.result.keydata);
            }));
        future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
                                  { "keyname": "GVUsername:" + accountId }).
            then(function(f) {
                username = Base64.decode(f.result.keydata);
            }));
        future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
                                  { "keyname": "GVPassword:" + accountId }).
            then(future.callback(this, function(f) {
                password = Base64.decode(f.result.keydata);
                console.log("auth details: ", username, password, rnrse, auth);
                this.GVClients[accountId] = new GV.Client({ email: username, password: password, rnr_se: rnrse, authToken: auth });
                future.result = { client: this.GVClients[accountId], returnValue: true };
            })));
        return future;
    }
});