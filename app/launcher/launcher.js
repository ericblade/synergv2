enyo.kind({
	name: "SynergyLauncher",
	kind: enyo.Component,

	components: [
		{ kind: "ApplicationEvents", /*onApplicationRelaunch: "applicationRelaunchHandler",*/ onWindowParamsChange: "applicationRelaunchHandler", onUnload: "appUnloaded" },
		{ name: "Prefs", kind: "enyo.PreferencesService", onFetchPreferences: "prefsReceived" },
        { name: "SyncAllAccounts", kind: "PalmService", service: "palm://com.ericblade.synergv.service/", method: "syncAllAccounts" },
		//{ name: "SubscribeService", kind: "PalmService", service: "palm://com.ericblade.synergv.service/", method: "subscribeToMe", subscribe: true, onSuccess: "subscribeSuccess", onFailure: "subscribeFailure" },
        { name: "ConnectionService", kind: "PalmService", service: "palm://com.palm.connectionmanager/", method: "getStatus", onSuccess: "connectionStatusChange", subscribe: true},
		{ name: "BoxcarLogin", kind: "WebService", url: "https://boxcar.io/devices/sessions/access_token", onSuccess: "boxcarLoginSuccess", onFailure: "boxcarLoginFailure" },
    ],
	applicationRelaunchHandler: function(inSender) {
		this.log(enyo.windowParams);
		if(!this.processWindowParams(enyo.windowParams))
            this.openCard(enyo.windowParams);
	},
    startup: function() {
        this.log(enyo.windowParams);
        this.applicationRelaunchHandler();
		this.$.ConnectionService.call({ });
		this.$.Prefs.fetchPreferences([ "synergvBoxcarUsername", "synergvBoxcarPassword" ], true);
    },
	prefsReceived: function(inSender, inPrefs) {
		this.log(inPrefs);
		if(inPrefs.synergvBoxcarUsername !== undefined) this.boxcarUsername = inPrefs.synergvBoxcarUsername;
		if(inPrefs.synergvBoxcarPassword !== undefined) this.boxcarPassword = inPrefs.synergvBoxcarPassword;
		if(!this.boxcarUsername && !this.boxcarPassword && this.boxcarSocket)
		{
			this.boxcarSocket.close();
		} else if(this.boxcarUsername && this.boxcarPassword) {
			this.$.BoxcarLogin.call({ username: this.boxcarUsername, password: this.boxcarPassword, api_key: "WJgcS7XCHZjoJiTZsgPo" });
		}
	},
    processWindowParams: function(params) {
        switch(params.cmd) {
            case "syncAllAccounts":
                this.$.SyncAllAccounts.call({ });
                break;
            case "noWindow":
                return true;
			case "search":
				return false; // pass this thru to the app
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
    },
	boxcarLoginSuccess: function(inSender, inResponse, inRequest) {
		// TODO: we absolutely need to save this token, and attempt to re-use it first before getting a new one
		this.log("boxcarLoginSuccess: ", inResponse);
		//this.$.SubscribeService.call({ });
		this.boxcarToken = inResponse.access_token;
		if(this.boxcarToken) {// yay, webservice returns success with no results on a complete failure sometimes
			this.connectBoxcar();
		} else {
			// TODO: we should run Boxcar on a persistent activity, i guess. 
			setTimeout(enyo.bind(this, function() {
				this.$.BoxcarLogin.call({ username: this.boxcarUsername, password: this.boxcarPassword, api_key: "WJgcS7XCHZjoJiTZsgPo" });
			}), 15000);
		}
	},
	appUnloaded: function() {
		this.log("SynerGV app shutting down...");
		this.shuttingDown = true;
		if(this.boxcarSocket) {
			this.log("socket status=", this.boxcarSocket.readyState);
			//this.boxcarSocket.send("wtf");
		}
		if(this.boxcarSocket && this.boxcarSocket.readyState != 3 && this.boxcarSocket.readyState != 0) {
			this.log("closing socket");
			this.boxcarSocket.close();
		}
		this.boxcarSocket = undefined;
		this.log("ready to close");
	},
	connectBoxcar: function() {
		this.log();
		if(!this.boxcarUsername || !this.boxcarPassword || !this.boxcarToken) {
			this.log("no boxcar credentials supplied, bailing");
			return;
		}
		this.boxcarSocket = /*new WebSocket("ws://127.0.0.1/websocket");*/ new WebSocket("ws://farm.boxcar.io:8080/websocket");
		this.boxcarSocket.onopen = enyo.bind(this, function(inEvent) {
			this.waitingOnSocket = false;
			this.log("socket opened", inEvent);
			this.boxcarSocket.send('{"access_token":"' + this.boxcarToken + '"}');
		});
		this.boxcarSocket.onerror = enyo.bind(this, function(inEvent) {
			this.log("socket error", inEvent);
			if(this.boxcarDash) {
				this.boxcarDash.destroy();
				this.boxcarDash = undefined;
			}
		});
		this.boxcarSocket.onclose = enyo.bind(this, function(inEvent) {
			this.log("socket closed", inEvent);
			if(this.boxcarDash) {
				this.boxcarDash.destroy();
				this.boxcarDash = undefined;
			}
			if(this.Online && !this.shuttingDown && this.boxcarUsername && this.boxcarPassword) {
				this.$.BoxcarLogin.call({
					username: this.boxcarUsername,
					password: this.boxcarPassword,
					api_key: "WJgcS7XCHZjoJiTZsgPo"
				});
			}
		});
		this.boxcarSocket.onmessage = enyo.bind(this, function(inEvent) {
// {"code":200,"message":"success","badge_count":48}
//
//  {"all_unread_count":45,
//	"icon":"http://s3.amazonaws.com/boxcar-production1/providers/icons/316/google_voice_512_normal_48.png",
//	"sound":"Default",
//	"from_screen_name":"Laura (SMS)",
//	"message":"message text line 1  \r\nmessage text line 2  \r\nmessage text line 3",
//	"service_unread_count":45,
//	"created_at":"2012-07-12 22:15:47 UTC",
//	"service_id":1992242,
//	"source_url":null,
//	"service_name":"Google Voice",
//	"provider_id":316,
//	"provider_name":"Google Voice",
//	"push_hash":"01a3c7d9f57918a2cd3527e4503fbf6593fe6c9a"}
			this.log("socket received message", inEvent);
// message data= {"code":500,"error":"Could not authenticate user"}
			var data = JSON.parse(inEvent.data);
			this.log("message data=", data);
			if(data.code == 200) { // login ok
				if(this.boxcarDash) {
					this.boxcarDash.destroy();
				}
				this.boxcarDash = this.createComponent( {
					kind: "Dashboard",
					smallIcon: "mainApp/images/google-voice-icon24.png",
					icon: "mainApp/images/synergv48.png",
					//onMessageTap: "dashboardTap",
					//onIconTap: "dashboardTap",
				});
				var boxcarLayer = { icon: "mainApp/images/synergv48.png",
									smallIcon: "mainApp/images/google-voice-icon24.png",
									title: "SynerGV Boxcar Notification", text: "Closing this will stop push notifications",
									};
				this.boxcarDash.push(boxcarLayer);

			}
			if(data.code == 500) { // no authorization

				this.boxcarSocket.close();
			}
			if(data.provider_id == 316) { // Google Voice
				this.log("Syncing SynerGV from Boxcar event!");
				this.$.SyncAllAccounts.call({ }, { subscribe: true });
			}
		});
	},
	boxcarLoginFailure: function(inSender, inError, inRequest) {
		this.log("boxcarLoginFailure: ", inError);
		// {"error_code":500,"error_message":"Incorrect username or password"}
		// TODO: open an error box explaining the error_message
		this.boxcarToken = undefined;
	},
	subscribeSuccess: function(inSender, inResponse, inRequest) {
		this.log("subscribe success: ", inResponse);
	},
	subscribeFailure: function(inSender, inError, inRequest) {
		this.log("subscribe failure: ", inError);
		//this.$.SubscribeService.call({ }, { subscribe: true });
	},
    connectionStatusChange: function(inSender,status,inRequest) {
        /* status:
            errorCode
            errorText
            isInternetConnectionAvailable
            returnValue (true if we are initially subscribing, otherwise nonexistent)
            wifi [object]
            wan [object]
            btpan [object]
        */
        if(status.isInternetConnectionAvailable != this.Online)
        {
            var enabled = status.isInternetConnectionAvailable ? "Online" : "Offline";
            this.Online = status.isInternetConnectionAvailable;
            this.log("Internet Status Change: " + enabled);
            //enyo.windows.addBannerMessage("GVoice: "+enabled, '{}', "images/google-voice-icon24.png", "")
            if(this.Online && !this.shuttingDown)
            {
				this.connectBoxcar();
				this.$.SyncAllAccounts.call({ });
            } else {
            }
        }
    },

});