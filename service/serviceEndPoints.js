// TODO: Need to not clear the pending messages until they are actually sent, on the off chance internet is flaky.
// perhaps should add a confidence level to our internet watch? maybe not.
var fs = require('fs');
var servicePath = fs.realpathSync('.');
var modulePath = servicePath + '/node_modules';
//var GV = require(servicePath + '/node_modules/google-voice/');
var GV = require(modulePath + '/google-voice/google-voice.js');
//var WebSocket = require(servicePath + '/node_modules/websocket-client').WebSocket;

/*var ws = new WebSocket('ws://node.remysharp.com:8001');
ws.addListener('data', function(buf) {
	console.log("ws rec:", buf);
});
ws.onmessage = function(m) {
	console.log("ws msg:", m);
}*/
//ws.send('{ "access_token": "asdfasdfasdfasdf" }');
// TODO: we need to disable/cancel our Activity at onEnable with enabled: false
// TODO: probably also need to setup an activity that's name is based on the account name,
//       so that we have one activity per account, and then it should be cake to
//       know which account it wants us to work on.  Also, someone could have multiple
//       accounts for a service, with only one of them enabled for messaging (if you have more than one capability)
// TODO: I think I'd like to add a seperate file that actually handles the
//       login/authenticate/retrieve messages/send messages stuff, and mostly just
//       leave this file alone.

// NOTE: There are a few service calls to the Palm ActivityManager service
// in this source code, that are currently commented out.  I/We need to figure
// out how to properly get the ActivityManager to work to make the most efficient
// use of the database and built-in power saving functions of webOS.
// At the moment, I have wired a simple 5-minute sync timer that should sync
// incoming and outgoing messages at the same time.
// Ideally, we want to have the service as idle as possible, so we want to just
// wake it when a user actually inserts a message into the database.
// Personally, I'm not sure exactly how IM services that need a persistent
// connection are going to handle this, but hopefully we can come up with something
// there.
//
// Also, there is a bug in this that does not show the account type inside the
// messaging app's drop down status list.  I'm not certain, but I think that
// may be due to the example account setup not having a CONTACTS connector.

// Just a log to say we're present.  After installing the app/service, you can
// run "run-js-service -k /media/cryptofs/apps/usr/palm/services/your.service.directory"
// to see the actual output from the service.  That has been instrumental in helping me
// to figure out what's going on in here.  As well as "ls-monitor" to watch the
// service bus.
console.log("Loading serviceEndPoints *****************************************************");

// Called to test your credentials given - this is specified in the account-template.json, under "validator"
// args = { "username": username entered, "password": password entered,
//          "templateId": our template, "config": { ? } }
// return a "credentials" object and a "config" object.  The "config" object will get passed to
// the onCreate function when your account is created.
//
// Use this to go to your online service, and verify that the login information
// given by the user works.  Return any credentials you will need to login to the
// system again (ie username, password, service key, whatever), so that they will
// be passed to onCreate, where you can save them.
// Also called when credentials stop working, such as an expired access code, or
// password change, and the user enters new information.

checkCredentials = Class.create({
	run: function(future) {
		var args = this.controller.args;
		console.log("checkCredentials", args.username, args.password);
		
		var GVclient = new GV.Client({ email: args.username, password: args.password });
		future.now(function() {
			console.log("getting gvoice rnrse/authcode");
			GVclient.getRNRSE(function(error, response) {
				if(error) {
					// error.code = 10 message=GOOGLE_CLIENTLOGIN_ERROR - incorrect userid/password
					// error.code = 11 message=REQUEST_ERROR - wifi off					
					console.log("error retrieving inbox " + JSON.stringify(error));
					switch(error.code) {
						case 10: error.code = "401_UNAUTHORIZED"; break;
						case 11: error.code = "CONNECTION_FAILED"; break;
						default: error.code = "UNKNOWN_ERROR"; break;
					}
					future.setException(Foundations.Err.create(error.code, error.message));
					future.result = { returnValue: false, errorCode: error.code, errorText: error.message };
				} else {
					console.log("RNRSE received");
					future.result = { returnValue: true, 
										credentials:
										{
											common:
											{
												password: args.password,
												auth: GVclient.auth.getAuthId(),
												rnrse: GVclient.config.rnr_se,
											},
										},
										config:
										{
											username: args.username,
											password: args.password,
											auth: GVclient.auth.getAuthId(),
											rnrse: GVclient.config.rnr_se
										}
									};
				}
			});
		}).then(function(fut) {
			console.log("then fut=", JSON.stringify(fut.result));
			future.result = fut.result;
			future.result.returnValue = false;
		});
	},
	timeoutReceived: function(x) {
		console.log("Timeout received! "+x);
		ServiceError("timeoutReceived:"+x, 504);
	}
});

// Called when your account is created from the Accounts settings, use this
// function to create any account specific information.  In this example,
// we're going to create a loginstate object, so the messaging app can see that
// we do, in fact, exist.
// specified in your account-template.json

onCreate = Class.create({
	run: function(future) {
		var args = this.controller.args;
		console.log("onCreate args=", JSON.stringify(args));

		// Setup permissions on the database objects so that our app can read/write them.
		// This is purely optional, and according to the docs here:
		// https://developer.palm.com/content/api/dev-guide/synergy/creating-synergy-contacts-package.html
		// You shouldn't even need to do this. I wasn't able to immediately get the file method to work though.

		var permissions = [
			{
				type: "db.kind",
				object: "com.ericblade.synergv.immessage:1",
				caller: "com.ericblade.*",
				operations: {
					read: "allow", 
					create: "allow",
					"delete": "allow",
					update: "allow"
				}
			},
			{
				type: "db.kind",
				object: "com.ericblade.synergv.immessage:1",
				caller: "com.palm.*",
				operations: {
					read: "allow",
					create: "allow",
					"delete": "allow",
					update: "allow",
				}
			}
		];

		PalmCall.call("palm://com.palm.db/", "putPermissions", { permissions: permissions } ).then(function(fut)
		{
			console.log("permissions put result=", JSON.stringify(fut.result));
			fut.result = { returnValue: true, permissionsresult:fut.result };
		}).then(function(fut2) {
			console.log("storing account keys");
			var keystore1 = { "keyname":"GVUsername:"+args.accountId, "keydata": Base64.encode(args.config.username), "type": "AES", "nohide":true};
			var keystore2 = { "keyname":"GVPassword:"+args.accountId, "keydata": Base64.encode(args.config.password), "type": "AES", "nohide":true};
			var keystore3 = { "keyname":"GVAuth:"+args.accountId, "keydata": Base64.encode(args.config.auth), "type": "AES", "nohide":true };
			var keystore4 = { "keyname":"GVRNRSE:"+args.accountId, "keydata": Base64.encode(args.config.rnrse), "type": "AES", "nohide":true };
		
			//...Save encrypted username/password for syncing.
			PalmCall.call("palm://com.palm.keymanager/", "store", keystore3);
			PalmCall.call("palm://com.palm.keymanager/", "store", keystore4);
			PalmCall.call("palm://com.palm.keymanager/", "store", keystore1).then( function(f) 
			{
				console.log("keymanager username store result=", JSON.stringify(f.result));
				if (f.result.returnValue === true)
				{
					PalmCall.call("palm://com.palm.keymanager/", "store", keystore2).then( function(f2) 
				   {
					  console.log("keymanager password store result=", JSON.stringify(f2.result));
					  future.result = f2.result;
				   });
				}
				else   {
				   future.result = f.result;
				}
			});			
		});
		
	}
});

// Called when your account is deleted from the Accounts settings, probably used
// to delete your account info and any stored data

onDelete = Class.create({
	run: function(future) {
		var args = this.controller.args;
		console.log("onDelete", JSON.stringify(args));
		if(args.accountId !== undefined) {
			PalmCall.call("palm://com.palm.keymanager/", "remove", { keyname: "GVUsername:" + args.accountId });
			PalmCall.call("palm://com.palm.keymanager/", "remove", { keyname: "GVPassword:" + args.accountId });
			PalmCall.call("palm://com.palm.keymanager/", "remove", { keyname: "GVAuth:" + args.accountId });
			PalmCall.call("palm://com.palm.keymanager/", "remove", { keyname: "GVRNRSE:" + args.accountId });
		}
		DB.del({ from: "com.ericblade.synergv.loginstate:1" }).then(function(fut) {
			future.result = fut.result
		});
	}
});

var onCapabilitiesChanged = function(future) {};

// Called when multiple capabilities are changed, instead of calling onEnabled several times
// Only apparently useful if your service handles multiple Synergy capabilities

onCapabilitiesChanged.prototype.run = function(future) {
    console.log("onCapabilitiesChanged");
}
 
var onCredentialsChanged = function(future) {};

// Called when user has entered new, validated credentials
// Intended so that if you've been not syncing due to a credentials failure, then you'll know
// that it should be good to go again

onCredentialsChanged.prototype.run = function(future) { 
    console.log("onCredentialsChanged"); 
    future.result = { returnValue: true }; 
};

var loginStateChanged = function(future) {};

// Included as part of the template.  You may want to set up a database watch
// on your imstate objects, so you know when someone hits the "Offline" or
// "online" toggle in the Messaging app, so that you can login/logout.
loginStateChanged.prototype.run = function(future) {
	console.log("loginStateChanged");
	future.result = { returnValue: true };
};

var sendIM = function(future) {};

// Included as part of the template.  You might want to fill this in with
// your outgoing message code, to make it easy to call when needed.
var sendIM = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		console.log("sendIM", JSON.stringify(args));
		
		assistant.GVclient.connect('sms', { outgoingNumber: args.to, text: args.text }, function(error, response, body) {
			var data = JSON.parse(body);
			if(error || !data.ok) {
				console.log("Error", error, "body", body);
				future.result = { returnValue: false };
			} else {
				console.log("Message sent");
				future.result = { returnValue: true };
			}
		});		
	},
	setup: function() {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		var future = new Future;
		var username = "";
		var password = "";
		var auth = "";
		var rnrse = "";
		
		if(!assistant.GVclient)
		{
			console.log("sendIM was not able to locate a GVclient");
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVAuth:" + args.accountId }).then(function(f) {
				auth = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVRNRSE:" + args.accountId }).then(function(f) {
				rnrse = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVUsername:" + args.accountId }).then(function(f) {
				username = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVPassword:" + args.accountId }).then(function(f) {
				password = Base64.decode(f.result.keydata);
				console.log("auth details: ", username, password, rnrse, auth);
				assistant.GVclient = new GV.Client({ email: username, password: password, rnr_se: rnrse, authToken: auth });
				future.result = { returnValue: true };
			}));
/*			future.now(function() {
				PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVAuth:" + args.accountId}).then(function(authF)
				{
					if(authF.result.returnValue === true)
					{
						auth = Base64.decode(authF.result.keydata);
						console.log("pulled auth", auth);
						PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVRNRSE:" + args.accountId}).then(function(rnrF)
						{
							if(rnrF.result.returnValue === true) {
								rnrse = Base64.decode(rnrF.result.keydata);
								console.log("pulled rnr", rnrse);
							}
							PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname" : "GVUsername:" + args.accountId }).then(function(f)
							{
								if(f.result.returnValue === true) {
									username = Base64.decode(f.result.keydata);
									console.log("pulled username", username);
									PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVPassword:" + args.accountId }).then(function(f1) {
										if(f1.result.returnValue === true) {
											password = Base64.decode(f1.result.keydata);
											console.log("pulled password", password);
											assistant.GVclient = new GV.Client({ email: username, password: password, rnr_se: rnrse, authToken: auth });
											future.result = { returnValue: true };
										} else {
											future.result = { returnValue: false };
										}
									});
								} else {
									future.result = { returnValue: false };
								}
							});
						});
					}
				});
			});*/
		} else {
			future.result = { returnValue: true };
		}
		return future;
	}
});

var sendCommand = function(future) {};

// Included as part of the template.  You might want to fill this in with
// any outgoing command code, to make it easy to call when needed.
sendCommand.prototype.run = function(future) {
	console.log("sendCommand");
	future.result = { returnValue: true };
};

//*****************************************************************************
// Capability enabled notification - called when capability enabled or disabled
//*****************************************************************************
var onEnabled = function(future){};

//
// Synergy service got 'onEnabled' message. When enabled, a sync should be started and future syncs scheduled.
// Otherwise, syncing should be disabled and associated data deleted.
// Account-wide configuration should remain and only be deleted when onDelete is called.
// onEnabled args should be like { accountId: "++Mhsdkfj", enabled: true }
// 

onEnabled.prototype.run = function(future) {  
    var args = this.controller.args;

    console.log("onEnabledAssistant args=", JSON.stringify(args));
	
	if(!args.accountId) return;
	
	if(!args.enabled)
	{
		// cancel our sync activity, and remove the entry from the messaging loginstates,
		// so we no longer show up in the app
		future.nest(PalmCall.call("palm://com.palm.activitymanager/", "stop", { activityName: "SynerGVOutgoingSync:" + args.accountId }).then(function(f) {
			console.log("outgoing sync stop result=", JSON.stringify(f.result));
		}));
		future.nest(PalmCall.call("palm://com.palm.power/timeout/", "clear", { key: "SynerGVsync:" + args.accountId }).then(function(f) {
			console.log("incoming sync stop result=", JSON.stringify(f.result));
		}));
		future.nest(DB.del({ from: "com.ericblade.synergv.loginstate:1", where: [ { prop: "accountId", op: "=", val: args.accountId } ] }).then(function(f) {
			console.log("loginstate db removal result=", JSON.stringify(f.result));
			future.result = { returnValue: true };
		}));
	}
	else
	{
		// Create an object to insert into the database, so that the messaging app
		// knows that we exist.
		var loginStateRec = {
			"objects":[
			{
				_kind: "com.ericblade.synergv.loginstate:1",
				// TODO: we should pull this from the account template.. how?
				serviceName: "type_synergv",
				accountId: args.accountId,
				username: "blade.eric", 
				state: "online", // it doesn't -seem- to matter what i put here, there may be another parameter involved
				availability: 1
			}]
		};

		// And then start an Activity to organize our syncing
		future.nest(PalmCall.call("palm://com.palm.db/", "put", loginStateRec).then(function(f) {
			console.log("loginstate put result", JSON.stringify(f.result))
		}));
		future.nest(PalmCall.call("palm://com.palm.activitymanager/", "create",
									{
										start: true,
										activity: {
											name: "SynerGVOutgoingSync:" + args.accountId,
											description: "SynerGV Pending Messages Watch",
											type: {
												foreground: true,
												power: true,
												powerDebounce: true,
												explicit: true,
												persist: true,
											},
											requirements: { internet: true },
											trigger: {
												method: "palm://com.palm.db/watch",
												key: "fired",
												params: {
													subscribe: true,
													query: {
														from: "com.ericblade.synergv.immessage:1",
														where: [
															{ prop: "status", op: "=", val: "pending" },
															{ prop: "folder", op: "=", val: "outbox" },
														],
														limit: 1
													}
												}
											},
											callback: {
												method: "palm://com.ericblade.synergv.service/sync",
												params: '{ accountId: "' + args.accountId + '" }',
											}
										}
								
			
		}).then(function(f) {
			console.log("activity start result", JSON.stringify(f.result));
			future.result = { returnValue: true };
		}));
	}
					  
};


// Here's some possibly not well known things about the services that I'm learning while attempting to read the
// service code itself (which is in Javascript, but without knowing it's intentions, it's quite difficult to read
// for my skill level)
//
// The command assistants appear to be instances of Prototype js lib Classes.
// You should be able to do something like
//
// runCommandAssistant = Class.create({ run: ..., complete: ... })
//
// This would make it a lot more enyo-like in structure.
//
// Available functions that the service appears to call inside a class:
//
// setup - called before running a command (we should try to adopt a thing here, perhaps)
// commandTimeout - not a function, but apparently you can set the timeout for individual commands by setting a commandTimeout
//                  variable.  This will override the command's configured timeout or the service as a whole's timeout
// timeoutReceived - called when a command has reached it's timeout
// complete - called when a command run is completed
// cleanup - called after complete
// yield - called when a "yield" Event happens, whatever that means
// cancelSubscription - presumably called when a subscription is cancelled

// The "sync" assistant is normally called from the CONTACTS "Sync Now" button.
// This doesn't seem to be the case when a MESSAGING connector is added, but we're going
// to use this to fire off a database watch.  If you're going to be retrieving data from the
// internet (presumably!) you probably want to add a call to the Alarm function, so that you
// can get a wake up alert here.
// Keep in mind that Synergy can create multiple accounts of one type, so you probably want to dig up
// all possible accountinfos, and sync them all.

// TODO: Add support to the test app to inject accountId here

var startActivity = Class.create({
	run: function(activityFuture)
	{
		var args = this.controller.args;
		PalmCall.call("palm://com.palm.activitymanager/", "create",
		{
		start: true,
		activity: {
			name: "SynerGVOutgoingSync:" + args.accountId,
			description: "SynerGV Pending Messages Watch",
			type: {
				foreground: true,
				power: true,
				powerDebounce: true,
				explicit: true,
				persist: true
			},
			requirements: {
				internet: true
			},
			trigger: {
				method: "palm://com.palm.db/watch",
				key: "fired",
				params: {
					subscribe: true,
					query: {
						from: "com.ericblade.synergv.immessage:1",
						where: [
							{ prop: "status", op: "=", val: "pending" },
							{ prop: "folder", op: "=", val: "outbox" }
						],
						limit: 1
					}
				}
			},
			callback: {
				method: "palm://com.ericblade.synergv.service/sync",
				params: "{ accountId: " + args.accountId + " }"
			}
		}
		}).then(function(f) {
			console.log("startActivity result=", JSON.stringify(f.result));
			activityFuture.result = f.result;
		});
	}
});

var adoptActivity = Class.create({
	run: function(adoptFuture)
	{
		var args = this.controller.args;
		PalmCall.call("palm://com.palm.activitymanager/", "adopt", {
			activityName: "SynerGVOutgoingSync:" + args.accountId,
			wait: true,
			subscribe: true
		}).then(function(f) {
			console.log("adoptActivity result", JSON.stringify(f.result));
			adoptFuture.result = f.result;
		});
	}
});

var completeActivity = Class.create({
	run: function(completeFuture)
	{
		var args = this.controller.args;
		PalmCall.call("palm://com.palm.activitymanager/", "complete", {
			activityName: "SynerGVOutgoingSync:" + args.accountId,
			restart: true,
			// the docs say you shouldn't need to specify the trigger and callback conditions again, i think..
			// someone else said reset the callback to a different function .. to avoid the "Temporarily Not Available" problem
			// other people say you do. so let's try it.
			trigger: {
			  key: "fired",
			  method: "palm://com.palm.db/watch",		  
			  params: {
				  query: {
					  from: "com.ericblade.synergv.immessage:1",
					  where:
					  [
						  { "prop":"folder", "op":"=", "val":"outbox" },
						  { "prop":"status", "op":"=", "val":"pending" }, 
					  ]
				  },
				  subscribe: true
			  },
			}
		}).then(function(f) {
			console.log("completeActivity result", JSON.stringify(f.result));
			completeFuture.result = f.result;
		});
	}
});

var cancelActivity = Class.create({
	run: function(cancelFuture)
	{
		var args = this.controller.args;
		PalmCall.call("palm://com.palm.activitymanager/", "cancel", {
			activityName: "SynerGVOutgoingSync:" + args.accountId
		}).then(function(f) {
			cancelFuture.result = f.result;
		});
	}
});

var sync = Class.create({
	setup: function() {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		var future = new Future;
		var username = "";
		var password = "";
		var auth = "";
		var rnrse = "";
		
		console.log("*** sync setup");
		if(args.accountId === undefined)
		{
			var name = args.$activity.name;
			var x = name.indexOf(":")+1;
			if(x == -1) return undefined;
			args.accountId = name.substr(x);
		}
		
		if(!assistant.GVclient)
		{
			console.log("sync was not able to locate a GVclient");
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVAuth:" + args.accountId }).then(function(f) {
				auth = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVRNRSE:" + args.accountId }).then(function(f) {
				rnrse = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVUsername:" + args.accountId }).then(function(f) {
				username = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVPassword:" + args.accountId }).then(function(f) {
				password = Base64.decode(f.result.keydata);
				console.log("sync auth details: ", username, password, rnrse, auth);
				assistant.GVclient = new GV.Client({ email: username, password: password, rnr_se: rnrse, authToken: auth });
				future.result = { returnValue: true };
				console.log("*** sync setup complete");
			}));			
		} else {
			future.result = { returnValue: true };
		}
		return future;
	},
	run: function(syncFuture) {
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		var conversationIds = [];
		console.log("sync run start", JSON.stringify(args));
		if(args.accountId === undefined)
		{
			var name = args.$activity.name;
			var x = name.indexOf(":")+1;
			if(x == -1) {
				syncFuture.result = { returnValue: false };
				return;
			}
			args.accountId = name.substr(x);
		}
		if(args.accountId === undefined || assistant.GVclient == undefined)
		{
		    syncFuture.result = { returnValue: false };
			return;
		}
		var f = new Future();
		var query = {
					  from: "com.ericblade.synergv.immessage:1",
					  where:
					  [
						  { "prop":"folder", "op":"=", "val":"outbox" },
						  { "prop":"status", "op":"=", "val":"pending" },
						  // TODO: add serviceName and userName to this query
					  ]
				  };

		f.now(function(future) {
			console.log("setting alarm");
			f.nest(PalmCall.call("palm://com.palm.power/timeout/", "set", {
				key: "SynerGVsync:" + args.accountId,
				"in": "00:05:00",
				uri: "palm://com.ericblade.synergv.service/sync",
				params: { accountId: args.accountId }
			}).then(function(postAlarmFuture) {
				console.log("alarm set result", JSON.stringify(postAlarmFuture.result));			
			}));
			future.nest(DB.find(query, false, false).then(function(dbFuture) {
				console.log("dbFuture result=", JSON.stringify(dbFuture.result));
				var dbResult = dbFuture.result;
				if(dbResult.results)
				{
					var mergeIDs = [ ];
					// Call our sendIM service function to actually send each message
					// Record each message ID into an array, and then update them in
					// the database as "successful", ie - sent.
					// You may want to not mark them as sent in the database until they
					// are actually sent via your sendIM function, though.
					for(var x = 0; x < dbResult.results.length; x++)
					{
						console.log("Merging status of ", dbResult.results[x]["_id"]);
						PalmCall.call("palm://com.ericblade.synergv.service/", "sendIM", {
							accountId: args.accountId,
							to: dbResult.results[x].to[0].addr,
							text: dbResult.results[x].messageText
						});
						mergeIDs.push( { "_id": dbResult.results[x]["_id"], "status": "successful" });
					}
					DB.merge(mergeIDs);
				}
				future.result = { returnValue: true };
			}));
		}).then(function(retrieveFuture) {
			console.log("********* Retrieving messages");
			if(!assistant.GVclient)
			{
				console.log("*** setting up gvclient ");
				this.setup();
			}
			console.log("*** ready?");
			assistant.GVclient.get('unread', null, function(error, response) {
				var msgstostore = [];
				if(error) {
					console.log("error retrieving unread messages", JSON.stringify(error));
				} else {
					response.messages.forEach(function(msg, index) {
						conversationIds.push(msg.id)
						var convquery = {
							from: "com.ericblade.synergv.immessage:1", 
							where: [ { prop: "gConversationId", op:"=", val: msg.id } ]
						};
						var msglist = [ ];
						if(msg.thread) // phone calls do not have a thread associated with them
						{
							msg.thread.forEach(function(sms) {
								//console.log("query text", sms.text);
								msglist[msglist.length] = sms.text;
							});
							convquery = {
								from: "com.ericblade.synergv.immessage:1",
								select: [ "messageText" ],
								where: [
									{ prop: "gConversationId", op: "=", val: msg.id },
									{ prop: "messageText", op: "=", val: msglist },
								]
							};
							console.log("*** performing database query for all loaded messages");
							DB.find(convquery, false, false).then(function(dbtestFuture) {
								console.log("********* dbtest results", JSON.stringify(dbtestFuture.result.results));
								msg.thread.forEach(function(sms) {
									var bFound = false;
									//console.log("checking list of length ", dbtestFuture.result.results.length);
									for(var i = 0; i < dbtestFuture.result.results.length; i++)
									{
										var messageText = dbtestFuture.result.results[i].messageText;
										bFound = (messageText == sms.text);
										if(bFound) {
											break;
										}
									}
									if(!bFound) {
										if(sms.from == "Me:") {
											var mergedata = {
												"gConversationId": msg.id,
												"successful": true
											};
											var mergequery = {
												"from":"com.ericblade.synergv.immessage:1",
												"where": [
													{ "prop":"folder", "op":"=", "val":"outbox" },
													{ "prop":"messageText", "op":"=", "val": sms.text },
												]
											}
/*				
					var dbq = [{
							_kind: "com.ericblade.synergv.immessage:1",
							accountId: args.accountId,
							localTimestamp: parseInt(args.time),
							timestamp: parseInt(args.time),//Math.round(this.MessageIndex[index].startTime / 100),
							folder: args.from == "Me:" ? "outbox" : "inbox",
							status: "successful",
							//flags: { read: this.MessageIndex[index].isRead, visible: true },
							messageText: args.text,
							from: { addr: args.from == "Me:" ? "blade.eric" : args.displayNumber },
							to: [{ addr: args.from == "Me:" ? args.displayNumber : "blade.eric" }],
							serviceName: "type_synergv",
							// TODO: MAKE THIS RIGHT
							username: "blade.eric",
							gConversationId: args.id
						}];

*/											
											console.log("merging", sms.text);
											DB.merge(mergequery, mergedata).then(function(mergeFuture) {
												console.log("merge status", JSON.stringify(mergeFuture.result));
												if(mergeFuture.result.returnValue === false || mergeFuture.result.count === 0)
												{
													msgstostore.push({
														_kind: "com.ericblade.synergv.immessage:1",
														accountId: args.accountId,
														localTimestamp: parseInt(msg.startTime),
														timestamp: parseInt(msg.startTime),
														folder: "outbox",
														status: "successful",
														messageText: sms.text,
														from: "blade.eric",
														to: args.displayNumber,
														serviceName: "type_synergv",
														username: "blade.eric",
														gConversationId: args.id
													});
												}
											});
										} else {
											msgstostore.push({
												_kind: "com.ericblade.synergv.immessage:1",
												accountId: args.accountId,
												localTimestamp: parseInt(msg.startTime),
												timestamp: parseInt(msg.startTime),
												folder: "inbox",
												status: "successful",
												messageText: sms.text,
												from: args.displayNumber,
												to: "blade.eric",
												serviceName: "type_synergv",
												username: "blade.eric",
												gConversationId: args.id
											});
										}
									} else {
										console.log("ignoring", sms.text);
									}
								});
							});
						}
							/*msg.thread.forEach(function(sms) {
							PalmCall.call("palm://com.ericblade.synergv.service/", "storeMsg", { accountId: args.accountId, id: msg.id, from: sms.from, displayNumber: msg.displayNumber, time: msg.startTime, text: sms.text });
							console.log(sms.time, msg.displayStartTime, sms.from, sms.text);
						});*/
					});
				}
				if(msgstostore.length > 0)
				{
					DB.put(msgstostore).then(function(putFuture) {
						console.log("putFuture result", JSON.stringify(putFuture.result));
					});
				}
				
				retrieveFuture.result = { returnValue: true };
				syncFuture.result = { returnValue: true };
			});
		}).then(function(tooManyFutures) {
			if(conversationIds.length > 0)
			{
				console.log("marking read: ", JSON.stringify(conversationIds));
				assistant.GVclient.set('read', { id: conversationIds });
			}
		});
	},
/*
 	{
		"$activity":
		{
			"activityId":1655,
			"callback":
			{
				"serial":530226716
			},
			"creator":
			{
				"serviceId":"com.ericblade.synergv.service"
			},
			"name":"SynerGVOutgoingSync:++HzTLgeaRwu+fra",
			"requirements":
			{
				"internet":
				{
					"bridge":
					{
						"state":"disconnected"
					},
					"isInternetConnectionAvailable":true,
					"vpn":
					{
						"state":"disconnected"
					},
					"wan":
					{
						"state":"disconnected"
					},
					"wifi":
					{
						"bssid":"20:4E:7F:0B:6B:EF",
						"interfaceName":"eth0",
						"ipAddress":"192.168.1.100",
						"isWakeOnWifiEnabled":true,
						"networkConfidenceLevel":"excellent",
						"onInternet":"yes",
						"ssid":"Angel",
						"state":"connected"
					}
				}
			},
			"trigger":
			{
				"fired":true,
				"returnValue":true
			}
		},
		"accountId":"++HzTLgeaRwu+fra"
	}
*/
	complete: function() {
		var args = this.controller.args;
		var activity = args.$activity;
		console.log("sync complete starting", JSON.stringify(args));
		if(args.accountId === undefined) return;
		return activity && PalmCall.call("palm://com.palm.activitymanager/", "complete", {
			//activityName: "SynerGVOutgoingSync",
			activityId: activity.activityId,
			restart: true,
			// the docs say you shouldn't need to specify the trigger and callback conditions again, i think..
			// someone else said reset the callback to a different function .. to avoid the "Temporarily Not Available" problem
			// other people say you do. so let's try it.
			trigger: {
			  key: "fired",
			  method: "palm://com.palm.db/watch",		  
			  params: {
				  query: {
					  from: "com.ericblade.synergv.immessage:1",
					  where:
					  [
						  { "prop":"folder", "op":"=", "val":"outbox" },
						  { "prop":"status", "op":"=", "val":"pending" },
						  // TODO: add serviceName and userName here
					  ],
					  limit: 1
				  },
				  subscribe: true
			  },
			}
		}).then(function(f) {
			console.log("sync complete completed", JSON.stringify(f.result));
			f.result = { returnValue: true };
		})
	}	
});

var storeMsg = Class.create({
	run: function(future)
	{
		var args = this.controller.args;
		console.log("attempting to store/reject message");
		var query = {
			from: "com.ericblade.synergv.immessage:1",
			where: [
				{ prop: "gConversationId", op: "=", val: args.id },
				{ prop: "messageText", op:"=", val: args.text }
			]
		};
					/*var dbq = [{
							_kind: "com.ericblade.synergv.immessage:1",
							// TODO: MAKE THIS RIGHT
							accountId: args.accountId,
							localTimestamp: parseInt(args.time),
							timestamp: parseInt(args.time),//Math.round(this.MessageIndex[index].startTime / 100),
							folder: args.from == "Me:" ? "outbox" : "inbox",
							status: "successful",
							//flags: { read: this.MessageIndex[index].isRead, visible: true },
							messageText: args.text,
							from: { addr: args.from == "Me:" ? "blade.eric" : args.displayNumber },
							to: [{ addr: args.from == "Me:" ? args.displayNumber : "blade.eric" }],
							serviceName: "type_synergv",
							// TODO: MAKE THIS RIGHT
							username: "blade.eric",
							gConversationId: args.id
						}];
		
		console.log("dbq=",JSON.stringify(dbq));
		future.result = { returnValue: true };
		return;*/
/*		DB.find(query, false, false).then(function(dbFuture) {
			var result = dbFuture.result;
			if(result.returnValue === true) {
				console.log("db find success, res=" + JSON.stringify(result.results));
				if(result.results.length == 0) // store it!
				{
*/
					var dbq = [{
							_kind: "com.ericblade.synergv.immessage:1",
							accountId: args.accountId,
							localTimestamp: parseInt(args.time),
							timestamp: parseInt(args.time),//Math.round(this.MessageIndex[index].startTime / 100),
							folder: args.from == "Me:" ? "outbox" : "inbox",
							status: "successful",
							//flags: { read: this.MessageIndex[index].isRead, visible: true },
							messageText: args.text,
							from: { addr: args.from == "Me:" ? "blade.eric" : args.displayNumber },
							to: [{ addr: args.from == "Me:" ? args.displayNumber : "blade.eric" }],
							serviceName: "type_synergv",
							// TODO: MAKE THIS RIGHT
							username: "blade.eric",
							gConversationId: args.id
						}];

					console.log("putting messages? put=", JSON.stringify(dbq));
					DB.put(dbq).then(function(putFuture) {
						console.log("putFuture result", JSON.stringify(putFuture.result));
						future.result = { returnValue: true };
					});
/*				} else {
					console.log("duplicate item");
					future.result = { returnValue: true };
				}
			} else {
				future.result = dbFuture.exception;
				console.log("find failure");
			}
		});*/
	}
})
