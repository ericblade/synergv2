serviceAssistant = Class.create({
    setup: function() {
        child_process.exec("rm ./*.txt");
        try{
            deleteDirRecursive("/tmp/synergvtemp");
        } catch(err) {
            
        }
        fs.mkdirSync('/tmp/synergvtemp', 0777);
		PalmCall.call("palm://com.palm.applicationManager/", "launch", { id: "com.ericblade.synergv", params: { cmd: "noWindow" } });
        var prefsFuture = PalmCall.call("palm://com.palm.systemservice/", "getPreferences",
                                    {
                                        keys: [ "synergvSyncOutgoing", "synergvMarkReadOnSync",
                                               "synergvSyncTime", "synergvSyncPlacedCalls",
                                               "synergvSyncInbox", "synergvDeleteAction" ]
                                    });
               
        prefsFuture.then(prefsFuture.callback(this, function(f) {
            this.syncOutgoing = !!f.result.synergvSyncOutgoing;
            this.markReadOnSync = !!f.result.synergvMarkReadOnSync;
            this.syncPlacedCalls = !!f.result.synergvSyncPlacedCalls;
            this.syncInbox = !!f.result.synergvSyncInbox;
            this.deleteAction = f.result.synergvDeleteAction || "Archive";
            this.syncTime = parseInt(f.result.synergvSyncTime, 10) ? parseInt(f.result.synergvSyncTime, 10) : 5;
            this.syncTime = this.syncTime * 60;
            console.log("syncOutgoing=" + this.syncOutgoing + " markReadOnSync=" + this.markReadOnSync + " syncTime=" + this.syncTime);
            console.log("syncPlacedCalls=" + this.syncPlacedCalls + " synergvSyncInbox=" + this.syncInbox + " synergvDeleteAction=" + this.deleteAction);
            prefsFuture.result = { returnValue: true };
        }));
        return prefsFuture;
    },
    getGVClientForAccount: function(accountId)
    {
        var future = new Future;
        var auth, rnrse, username, password;
        if(!this.GVClients)
            this.GVClients = { };
            
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
                this.GVClients[accountId] = new GV.Client({ email: username, password: password , rnr_se: rnrse, authToken: auth });
                /*console.log("***** GV Client authToken: " + this.GVClients[accountId].config.authToken);
                if(this.GVClients[accountId].config && this.GVClients[accountId].config.authToken && auth != this.GVClients[accountId].config.authToken) {
                    var accountstore = {
                        objects: [{
                            _kind: "com.ericblade.synergv.configuration:1",
                            accountId: accountId
                        }]
                    };
                    PalmCall.call("palm://com.palm.db/", "put", accountstore).then(function(fut2) {
                        var keystore3 = { "keyname":"GVAuth:"+args.accountId, "keydata": Base64.encode(args.config.auth), "type": "AES", "nohide":true };
                    });
                }*/
                future.result = { client: this.GVClients[accountId], returnValue: true };
            })));
        return future;
    }
});