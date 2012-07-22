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
		if( (!this.boxcarUsername || !this.boxcarPassword) && this.boxcarSocket)
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
			setTimeout(enyo.bind(this, this.connectBoxcar), 1000);
			//this.connectBoxcar();
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
		this.log("******************** connecting to socket ********************* ");
		this.boxcarSocket = /*new WebSocket("ws://127.0.0.1/websocket");*/ new WebSocket("ws://farm.boxcar.io:8080/websocket");

		if(this.socketTimer)
		{
			clearTimeout(this.socketTimer);
		}
		if(this.socketInterval)
		{
			clearInterval(this.socketInterval);
		}

		if(!this.boxcarConnectingDash) {
			this.boxcarConnectingDash = this.createComponent( {
				kind: "Dashboard",
				smallIcon: "mainApp/images/google-voice-icon24.png",
				icon: "mainApp/images/synergv48.png",
				//onMessageTap: "dashboardTap",
				//onIconTap: "dashboardTap",
			});
			var boxcarConnectingLayer = { icon: "mainApp/images/synergv48.png",
								smallIcon: "mainApp/images/google-voice-icon24.png",
								title: "Connecting to Boxcar", text: "Closing before connection may cause a webOS restart.",
								};
			this.boxcarConnectingDash.push(boxcarConnectingLayer);
		}

		this.socketTimer = setTimeout(enyo.bind(this, function() {
			this.log("Retrying Boxcar...");
			setTimeout(enyo.bind(this, this.connectBoxcar), 2000);
			//this.connectBoxcar();
		}), 30000);
			this.socketInterval = setInterval(enyo.bind(this, function() {
				this.log("boxcarSocket state=", this.boxcarSocket.readyState);
			}), 5000);

		this.boxcarSocket.onopen = enyo.bind(this, this.socketOpen);
		this.boxcarSocket.onerror = enyo.bind(this, this.socketError);
		this.boxcarSocket.onclose = enyo.bind(this, this.socketClose);
		this.boxcarSocket.onmessage = enyo.bind(this, this.socketMessage);

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
	socketOpen: function(inEvent) {
		this.log("socket opened ", inEvent);
		this.boxcarSocket.send('{"access_token":"' + this.boxcarToken + '"}');

		var oldDash = this.boxcarDash;
		this.boxcarDash = this.createComponent({
			kind: "Dashboard",
			smallIcon: "mainApp/images/google-voice-icon24.png",
			icon: "mainApp/images/synergv48.png",
		});
		var boxcarLayer = {
			icon: "mainApp/images/synergv48.png",
			smallIcon: "mainApp/images/google-voice-icon24.png",
			title: "SynerGV Boxcar.io Notification",
			text: "Closing will stop push notifications"
		};
		this.boxcarDash.push(boxcarLayer);
		if(oldDash)
			oldDash.destroy();
		if(this.boxcarConnectingDash)
		    this.boxcarConnectingDash.destroy();

		if(this.socketTimer) {
			clearTimeout(this.socketTimer);
		}
	},
	socketError: function(inEvent) {
		this.log("socket error ", inEvent);
		if(this.boxcarDash)
		    this.boxcarDash.destroy();
		if(this.boxcarConnectingDash)
		    this.boxcarConnectingDash.destroy();
		this.boxcarDash = this.boxcarConnectingDash = undefined;
	},
	socketClose: function(inEvent) {
		this.log("socket closed ", inEvent);
		/*if(this.boxcarDash) {
			this.boxcarDash.destroy();
			this.boxcarDash = undefined;
		}*/
		if(this.Online && !this.shuttingDown && this.boxcarUsername && this.boxcarPassword) {
			// attempt reconnect, in case we just lost connection, it should tell us if our
			// token has expired there. If it has, then that function should throw a message,
			// which we'll respond to by getting a new Token.
			setTimeout(enyo.bind(this, this.connectBoxcar), 2000);
			//this.connectBoxcar();
		}
	},
// {"code":200,"message":"success","badge_count":48}
//
//  {"all_unread_count":45,
//	"icon":"http://s3.amazonaws.com/boxcar-production1/providers/icons/316/google_voice_512_normal_48.png",
//	"sound":"Default",
//	"from_screen_name":"Laura (SMS)",
//	"message":"Redacted",
//	"service_unread_count":45,
//	"created_at":"2012-07-12 22:15:47 UTC",
//	"service_id":1992242,
//	"source_url":null,
//	"service_name":"Google Voice",
//	"provider_id":316,
//	"provider_name":"Google Voice",
//	"push_hash":"01a3c7d9f57918a2cd3527e4503fbf6593fe6c9a"}
// message data= {"code":500,"error":"Could not authenticate user"}

	socketMessage: function(inEvent) {
		this.log("socket received message ", inEvent);
		var data = JSON.parse(inEvent.data);
		this.log("message data=", data);
		switch(data.code) {
			case 200: // we're good, ignore
				break;
			case 500:
				this.boxcarSocket.close();
				break;
			default:
				if(data.provider_id == 316) {
					this.log("Syncing from Boxcar event!");
					this.$.SyncAllAccounts.call({ });
				}
		}
	}
});