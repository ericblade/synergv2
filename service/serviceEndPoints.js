// TODO: does our command watch persist? it doesn't show in the "Service Persistent" list .. ??
// TODO: rewrite sync to bail if there's no internet
// TODO: need to replace the timer for sync with a specificly timed Activity, and rewrite sync.complete to deal with resetting it up for a new specific time at the check interval
// TODO: can use schedule: { precise: true, interval: timer+"m" }, requirements: { internet: true }
// TODO: should we run sync before sending an IM?
// TODO: we should probably only run one sync if there's a bunch of IMs sent in a short time period.. or do we already.. ?
// TODO: it might be possible that just replacing the https event emitter with something that looks vaguely like it in
//		node_modules/googleclientlogin/index.js might get us running on webOS 2. . . 
// TODO: why does getSettings sometimes take .. damn near forever .. to return?
// TODO: we can "syncAllAccounts" now, why don't we just set that up to run on the timer, instead of an individual sync per account?
// TODO: how can we sync contacts added from the webOS app back to google?
// TODO: If sync() returned it's messages, we could use sync() instead of getVoiceMessages() in the app, and then it would automatically sync the messaging app .. ?

// Does deleting an account delete contacts??
// TODO: need to make sure that we have our outgoing and incoming sync activities still in the
//       system, somewhere that will be called regularly..
// (for determining actual account to send from when we receive an outgoing message from the database):
// run a query where conversation == the conversationID of the outgoing message, and
// to.addr == [ array of account names that could be possible ], order by most recent, limit 1,
// and if a result shows up, use that instead of the one supplied by messaging
//
// TODO: Maybe we should store one of the English timestamps into the Database, to ease Just Type display..
// TODO: i'm seeing duplciate "auth details" logs, it should be caching those for later runs during the same service execution?
// TODO: need to make sure we don't blow up on "missed call" and "placed call"
// TODO: need to see what happens when we record a call 
// TODO: look into Activities library at :
//		/usr/palm/frameworks/foundations/submission/108/javascript/control#
// TODO: can we monitor the immessage database on flags.read and see when the messaging app marks
//		a message read?
//    can we then use that to know when to mark a conversation read on the server?

// TODO: need to have onEnabled (false) delete all traces of our existence except for the actual
//		account data
//  (delete from com.ericblade.synergv.loginstate, .contact, .immessage, .imcommand, remove all
//		watches and alarms)
// TODO: investigate what happens if we don't even put in the loginstate, or what happens if we
//		watch on the loginstate and reset it to "online"/4 or "offline"/4
// TODO: explore seperating people's names into presumably first/middle/lasts before dropping them
//		into the contacts database

// var Class;
require.paths.push("./");
require.paths.push("./node_modules");
require.paths.push("./node_modules/jsdom");
require.paths.push("./node_modules/jsdom/lib");
require.paths.push("./node_modules/jsdom/node_modules");

var fs = require('fs');
var servicePath = fs.realpathSync('.');
var modulePath = servicePath + '/node_modules';
var GV = require(modulePath + '/google-voice/google-voice.js');

var https;
try {
    https = require('https');
} catch(err) {
    // leave https undefined
}

// TODO: we need to disable/cancel our Activity at onEnable with enabled: false

var getVoiceMessages = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			var GVclient = f.result.client;
			var start = ( ((args.page || 1) - 1) * 10) + 1;
			var params = { start: start, limit: 10 };
			if(args.inbox == "search")
			    params.query = args.query;
			GVclient.get(args.inbox || 'inbox', params, function(error, response) {
				if(error) {
					future.result = { returnValue: false, error: error };
				}
				else {
					future.result = { returnValue: true, messages: response.messages, total: response.total, resultsPerPage: response.resultsPerPage };
				}
				//fs.writeFileSync("/media/internal/gvmessages.json", JSON.stringify(future.result));
			});
		}));
		return future;
	}
});
					
var checkCredentials = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		console.log("checkCredentials", args.username, args.password);
		
		var GVclient = new GV.Client({ email: args.username, password: args.password });
		future.now(function() {
			GVclient.getRNRSE(function(error, response) {
				if(error) {
					// error.code = 10 message=GOOGLE_CLIENTLOGIN_ERROR - incorrect userid/password
					// error.code = 11 message=REQUEST_ERROR - wifi off					
					console.log("error retrieving rnrse " + JSON.stringify(error));
					switch(error.code) {
						case 2: error.code = "CONNECTION_FAILED"; break; // GET_RNRSE_ERROR
						case 10: error.code = "401_UNAUTHORIZED"; break;
						case 11: error.code = "CONNECTION_FAILED"; break;
						default: error.code = "UNKNOWN_ERROR"; break;
					}
					future.setException(Foundations.Err.create(error.code, error.message));
					future.result = {
						returnValue: false,
						errorCode: error.code,
						errorText: error.message
					};
				} else {
					future.result = {
						returnValue: true, 
						credentials:
						{
							common:
							{
								password: args.password,
								auth: GVclient.auth.getAuthId(),
								rnrse: GVclient.config.rnr_se
							}
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
			future.result = fut.result;
			future.result.returnValue = false;
		});
	},
	timeoutReceived: function(x) {
		console.log("Timeout received! "+x);
		ServiceError("timeoutReceived:"+x, 504);
	}
});

var getAccounts = Class.create({
	run: function(future) {
		var dbQuery = {
			select: [ "accountId" ],
			from: "com.ericblade.synergv.configuration:1"
		};
		future.nest(DB.find(dbQuery, false, false).then(function(f) {
			var dbResults = f.result.results;
			var ret = [ ];
			for(var x = 0; x < dbResults.length; x++) {
				ret.push(dbResults[x].accountId);
			}
			
			future.result = { returnValue: true, accounts: ret };
		}));
	}
});

var onCreate = Class.create({
	run: function(future) {
		var args = this.controller.args;

		var accountstore = {
			objects: [{
				_kind: "com.ericblade.synergv.configuration:1",
				accountId: args.accountId
			}]
		};
		PalmCall.call("palm://com.palm.db/", "put", accountstore).then(function(fut2) {
			var keystore1 = { "keyname":"GVUsername:"+args.accountId, "keydata": Base64.encode(args.config.username), "type": "AES", "nohide":true};
			var keystore2 = { "keyname":"GVPassword:"+args.accountId, "keydata": Base64.encode(args.config.password), "type": "AES", "nohide":true};
			var keystore3 = { "keyname":"GVAuth:"+args.accountId, "keydata": Base64.encode(args.config.auth), "type": "AES", "nohide":true };
			var keystore4 = { "keyname":"GVRNRSE:"+args.accountId, "keydata": Base64.encode(args.config.rnrse), "type": "AES", "nohide":true };
		
			//...Save encrypted username/password for syncing.
			PalmCall.call("palm://com.palm.keymanager/", "store", keystore3);
			PalmCall.call("palm://com.palm.keymanager/", "store", keystore4);
			PalmCall.call("palm://com.palm.keymanager/", "store", keystore1).then( function(f) 
			{
				if (f.result.returnValue === true)
				{
					PalmCall.call("palm://com.palm.keymanager/", "store", keystore2).then( function(f2) 
					{
						future.result = f2.result;
					});
				}
				else {
					future.result = f.result;
				}
			});			
		});
		
	}
});

// TODO: Make sure this deletes any stored data, IMs, and stuff.
// actually, all the removal is supposed to happen when disabling, according to the palm docs

var onDelete = Class.create({
	run: function(future) {
		var args = this.controller.args;
		console.log("onDelete", JSON.stringify(args));
		if(args.accountId !== undefined) {
			PalmCall.call("palm://com.palm.keymanager/", "remove",
							{ keyname: "GVUsername:" + args.accountId });
			PalmCall.call("palm://com.palm.keymanager/", "remove",
							{ keyname: "GVPassword:" + args.accountId });
			PalmCall.call("palm://com.palm.keymanager/", "remove",
							{ keyname: "GVAuth:" + args.accountId });
			PalmCall.call("palm://com.palm.keymanager/", "remove",
							{ keyname: "GVRNRSE:" + args.accountId });
			PalmCall.call("palm://com.palm.db/", "del",
							{
								query: {
									from: "com.ericblade.synergv.configuration:1",
									"where":
										[
											{
												prop:"accountId",
												op: "=",
												val: args.accountId
											}
										]
								}
							}
						);
		}
		DB.del({ from: "com.ericblade.synergv.loginstate:1" }).then(function(fut) {
			future.result = fut.result;
		});
	}
});

var onCapabilitiesChanged = function(future) {};

// Called when multiple capabilities are changed, instead of calling onEnabled several times
// Only apparently useful if your service handles multiple Synergy capabilities

// TODO: we should probably implement this
onCapabilitiesChanged.prototype.run = function(future) {
    console.log("onCapabilitiesChanged");
};
 
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

// Included as part of the template.  You might want to fill this in with
// your outgoing message code, to make it easy to call when needed.
var sendIM = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		console.log("sendIM", JSON.stringify(args));
		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			var client = f.result.client;
			client.connect('sms', {
				outgoingNumber: args.to,
				text: args.text
			}, function(error, response, body) {
				var data;
				try {
					data = JSON.parse(body);
				} catch(err) {
					data = {};
				}
				var status = "permanent-fail";
				var errormsg = "";
				if(error || !data.ok) {
					console.log("Error: ", error);
					console.log("body: ", body);
					console.log("data.ok: ", data.ok);
					console.log("data.code: ", data.data.code);
					switch(data.data.code) {
						case 20: errormsg = "Invalid Number"; break;
						case 58: errormsg = "SMS limit reached. Try again later, or send to fewer recipients."; break;
						case 66: errormsg = "Out of credit."; break;
						case 67: errormsg = "Destination not supported."; break;
						default: errormsg = "Unknown error code, please report this error and it's circumstances to blade.eric@gmail.com , thank you."; break;
					}
					future.result = { destination: args.to, status: status,
										errorcode: data.data.code, errormsg: errormsg,
										msgId: args.msgId, returnValue: true };
				} else {
					console.log("Message sent");
					future.result = { status: "successful", msgId: args.msgId, returnValue: true };
				}
			});
		}));
	},
	/*setup: function() {
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
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
									  { "keyname": "GVAuth:" + args.accountId }).then(function(f) {
				auth = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
									  { "keyname": "GVRNRSE:" + args.accountId }).then(function(f) {
				rnrse = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
									  { "keyname": "GVUsername:" + args.accountId }).then(function(f) {
				username = Base64.decode(f.result.keydata);
			}));
			future.nest(PalmCall.call("palm://com.palm.keymanager/", "fetchKey",
									  { "keyname": "GVPassword:" + args.accountId }).then(function(f) {
				password = Base64.decode(f.result.keydata);
				console.log("auth details: ", username, password, rnrse, auth);
				assistant.GVclient = new GV.Client({ email: username, password: password, rnr_se: rnrse, authToken: auth });
				future.result = { returnValue: true };
			}));
		} else {
			future.result = { returnValue: true };
		}
		return future;
	}*/
});

/* A block command looks like:
 * [
 * 	{
 * 		"_id":"++I49u5_qNOsGm9W",
 * 		"_kind":"com.ericblade.synergv.imcommand:1",
 * 		"_rev":2064603,
 * 		"_sync":true,
 * 		"command":"blockBuddy",
 * 		"fromUsername":"blade.eric",
 * 		"handler":"transport",
 * 		"params":{
 * 			"block":true
 * 		},
 * 		"serviceName":"type_synergv",
 * 		"targetUsername":"+12692908172"
 * 	}
 * ]
 */

var sendCommand = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		var accountList = { };
		console.log("sendCommand");
		
		future.nest(PalmCall.call("palm://com.ericblade.synergv.service/", "getAccounts", {}).then(function(f) {
			var accounts = f.result.accounts;
			for(var x = 0; x < accounts.length; x++) {
				PalmCall.call("palm://com.palm.service.accounts/", "getAccountInfo", { accountId: accounts[x] }).then(function(fut) {
					accountList[fut.result.result.username] = fut.result.result._id;
					console.log("adding " + fut.result.result.username + " to list as " + fut.result.result._id);
					if(x >= accounts.length) {
						fut.result = { returnValue: true };
						f.result = { returnValue: true };
					}
				});
			}
		}).then(function(f) {
			console.log("sendCommand account list=", JSON.stringify(accountList));
		}));
		var query = {
			from: "com.ericblade.synergv.imcommand:1",
			where: [
				{ "prop":"status", "op":"=", "val":"pending" }
			]
		};
		future.nest(DB.find(query, false, false).then(function(f) {
			var res = f.result.results;
			var mergeIds = [];
			for(var x = 0; x < res.length; x++) {
				mergeIds.push({ _id: res[x]._id, status: "failed" });
				switch(res[x].command) {
					case "blockBuddy":
						if(res[x].params.block)
						{
							// send block command for res[x].fromUsername on res[x].targetUsername
						} else {
							// send unblock command for res[x].fromUsername on res[x].targetUsername
						}
						break;
					case "sendBuddyInvite":
						// send buddy invite with message res[x].params.message for res[x].fromUsername to res[x].targetUsername
						break;
					case "deleteBuddy":
						// remove buddy from buddy list for res[x].fromUsername to res[x].targetUsername
						break;
				}
			}
			DB.merge(mergeIds);
			f.result = { returnValue: true };
			future.result = { returnValue: true };
		}));
		
		return future;
	},
	complete: function() {
		var args = this.controller.args;
		var activity = args.$activity;
		console.log("sendCommand complete starting", JSON.stringify(args));
		//console.log("activity received was", JSON.stringify(activity));
		var newact = {
			//activityName: "SynerGVOutgoingSync",
			//activityId: activity.activityId,
			restart: true,
			// the docs say you shouldn't need to specify the trigger and callback conditions again, i think..
			// someone else said reset the callback to a different function .. to avoid the "Temporarily Not Available" problem
			// other people say you do. so let's try it.
			trigger: {
				key: "fired",
				method: "palm://com.palm.db/watch",
				params: {
					query: {
						from: "com.ericblade.synergv.imcommand:1",
						where:
						[
							{ "op": "=", "prop": "status", "val": "pending" }
						],
						limit: 1
					},
					subscribe: true
				}
			}
		};
		if(activity && activity.activityId) {
			newact.activityId = activity.activityId;
		} else {
			newact.activityName = "SynerGV pending commands watch";
		}
		PalmCall.call("palm://com.palm.activitymanager/", "complete",  newact).then(function(f) {
			//console.log("sync complete completed", JSON.stringify(f.result));
			f.result = { returnValue: true };
		});
	}
});

var onEnabled = Class.create({
	run: function(future) {
		var args = this.controller.args;
		console.log("onEnabled args=", JSON.stringify(args));
		
		if(!args.accountId) {
			future.result = { returnValue: false };
			return;
		}
		if(args.enabled === false) {
			PalmCall.call("palm://com.palm.service.accounts/", "getAccountInfo", { accountId: args.accountId }).then(function(accountFut) {
				console.log("Disabling account", accountFut.result.result.username);
				future.nest(PalmCall.call("palm://com.palm.activitymanager/", "stop", { activityName: "SynerGVOutgoingSync:" + args.accountId }).then(function(f) {
					console.log("outgoing sync stop result=", JSON.stringify(f.result));
				}));
				/*future.nest(PalmCall.call("palm://com.palm.power/timeout/", "clear", { key: "SynerGVsync:" + args.accountId }).then(function(f) {
					console.log("incoming sync stop result=", JSON.stringify(f.result));
				}));*/
				future.nest(DB.del({ from: "com.ericblade.synergv.contact:1", where: [ { prop: "accountId", op: "=", val: args.accountId } ] }).then(function(f) {
					console.log("contact removal result=", JSON.stringify(f.result));
				}));
				// TODO: we need to delete these by username not by accountId
				/*future.nest(DB.del({ from: "com.ericblade.synergv.imcommand:1", where: [ { prop: "accountId", op: "=", val: args.accountId } ] }).then(function(f) {
					console.log("imcommand removal result=", JSON.stringify(f.result));
				}));*/
				future.nest(DB.del({ from: "com.ericblade.synergv.immessage:1", where: [ { prop: "accountId", op: "=", val: args.accountId } ] }).then(function(f) {
					console.log("immessage removal result=", JSON.stringify(f.result));
				}));
				future.nest(DB.del({ from: "com.ericblade.synergv.loginstate:1", where: [ { prop: "accountId", op: "=", val: args.accountId } ] }).then(function(f) {
					console.log("loginstate db removal result=", JSON.stringify(f.result));
					f.result = future.result = { returnValue: true };
				}));
			});
		} else if(args.enabled === true) {
			future.nest(PalmCall.call("palm://com.palm.service.accounts/", "getAccountInfo", { accountId: args.accountId }).then(function(f) {
				var accountInfo = f.result.result;
				var serviceName = "";
				for(var x = 0; x < accountInfo.capabilityProviders.length; x++) {
					if(accountInfo.capabilityProviders[x].capability === "MESSAGING") {
						serviceName = accountInfo.capabilityProviders[x].serviceName;
					}
				}
				console.log("*** loginStateRec:" + serviceName +" " + args.accountId + " " + accountInfo.username + " online 4");
				var loginStateRec = {
					objects:
					[
						{
							_kind: "com.ericblade.synergv.loginstate:1",
							serviceName: serviceName,
							accountId: args.accountId,
							username: accountInfo.username,
							state: "online",
							availability: 4
						}
					]
				};
				future.nest(PalmCall.call("palm://com.palm.db/", "put", loginStateRec).then(function(f) {
					console.log("loginstate put result", JSON.stringify(f.result));
				}));
				future.nest(PalmCall.call("palm://com.ericblade.synergv.service/", "startActivity", { accountId: args.accountId }).then(function(f) {
					console.log("activity start result", JSON.stringify(f.result));
					PalmCall.call("palm://com.ericblade.synergv.service/", "syncContacts", { accountId: args.accountId });
					PalmCall.call("palm://com.ericblade.synergv.service/", "sync", { accountId: args.accountId, firstSync: true });
					future.result = { returnValue: true };					
				}));
			}));
		}
	}
});

var startActivity = Class.create({
	run: function(activityFuture)
	{
		var args = this.controller.args;
		
		PalmCall.call("palm://com.palm.activitymanager/", "create",
			{
				"start": true,
				"replace": true,
				"activity": {
					"name": "SynerGV pending commands watch",
					"description": "SynerGV pending commands watch",
					"type": {
						"background": true,
						"power": true,
						"powerDebounce": true,
						"explicit": true,
						"persist": true
					},
					"requirements": {
						"internet": true
					},
					"trigger": {
						"method": "palm://com.palm.db/watch",
						"key": "fired",
						"params": {
							"subscribe": true,
							"query": {
								"from": "com.ericblade.synergv.imcommand:1",
								"where": [
									{ "op": "=", "prop": "status", "val": "pending" }
								]
							}
						}
					},
					"callback": {
						"method": "palm://com.ericblade.synergv.service/sendCommand",
						"params": {}
					}
				}
			}
		);
		PalmCall.call("palm://com.palm.activitymanager/", "create",
			{
				"start": true,
				"replace": true,
				"activity": {
					"name": "SynerGVIncomingSync",
					"description": "SynerGV incoming message sync",
					"type": {
						"background": true,
						"power": true,
						"powerDebounce": true,
						"explicit": true,
						"persist": true
					},
					"requirements": {
						"internet": true
					},
					"schedule": {
						"precise": true,
						"interval": "1m"
					},
					"callback": {
						"method": "palm://com.ericblade.synergv.service/syncAllAccounts",
						"params": {}
					}
				}
			}					  
		);
		if(!args.accountId) {
			activityFuture.result = { returnValue: false, errormsg: "No Account Id given!" };
			return activityFuture;
		}
		var x = PalmCall.call("palm://com.palm.activitymanager/", "create",
			{
				start: true,
				replace: true,
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
			}
		);
		// there's probably already an activity for it
		x.onError(function(f) {
			console.log("activity starting failed for some reason");
			activityFuture.result = { returnValue: true };
		});
		x.then(function(f) {
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
							{ "prop":"status", "op":"=", "val":"pending" }
						]
					},
					subscribe: true
				}
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
		PalmCall.call("palm://com.palm.service.accounts/", "getAccountInfo", { accountId: args.accountId }).then(function(f) {
			console.log("Cancelling activity for accountId");
			PalmCall.call("palm://com.palm.activitymanager/", "cancel", {
				activityName: "SynerGVOutgoingSync:" + args.accountId
			}).then(function(fut) {
				cancelFuture.result = fut.result;
			});
		});
	}
});

var storeConversation = Class.create({
	run: function(future)
	{
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		
		var msg = args.conv;
		var msgTexts = [];
		var msgsToStore = [];
		var msgsToMerge = [];

		args.storeOwn = args.storeOwn || assistant.syncOutgoing;
		
		if(msg.labels.indexOf("voicemail") !== -1) {
			msg.messageText = "Voicemail Transcription: (" + msg.duration + " seconds) " + msg.messageText + " --- To listen: http://synergv/playVoicemail/" + args.accountId + "/" + msg.id;
			msgTexts.push(msg.messageText);
		} else if(msg.labels.indexOf("missed") !== -1) {
			msg.messageText = "Missed Call" + " --- To return call with your Google Voice account: http://synergv/placecall/" + args.accountId + "/" + msg.phoneNumber;
			msgTexts.push(msg.messageText);
		} else if(msg.labels.indexOf("received") !== -1) {
			msg.messageText = "Received Call";
			msgTexts.push(msg.messageText);
		} else if(msg.labels.indexOf("placed") !== -1) {
			console.log("syncPlacedCalls=" + assistant.syncPlacedCalls);
			if(assistant.syncPlacedCalls !== true)
			{
				future.result = { returnValue: true, status: "Not storing placed call." };
				return future;
			}
			msg.messageText = "Placed Call";
			msgTexts.push(msg.messageText);
		} else if(msg.thread) {
			msg.thread.forEach(function(sms, index) {
				sms.text += " -- " + sms.time;
				msgTexts.push(sms.text);
			});
		} else {
			console.log("Unhandled message labels: " + JSON.stringify(msg.labels));
		}
		var dbquery = {
			from: "com.ericblade.synergv.immessage:1",
			select: [ "messageText" ],
			where: [
				{ prop: "gConversationId", op: "=", val: msg.id },
				{ prop: "messageText", op: "=", val: msgTexts }
			]
		};
		future.nest(DB.find(dbquery, false, false).then(function(f) {
			var dbResults = f.result.results;
			PalmCall.call("palm://com.palm.service.accounts/", "getAccountInfo",
							{ accountId: args.accountId }).
			then(function(accountFuture) {
				var username = accountFuture.result.result.username;
				console.log("storeConversation for account", username);
				
				if(msg.thread) {
					msg.thread.forEach(function(sms, index) {
						var bFound = false;
						for(var x = 0; x < dbResults.length; x++) {
							if(dbResults[x].messageText === sms.text)
							{
								bFound = true;
								break;
							}
						}
						if(!bFound) {
							console.log("!bFound", sms.text);
							var dbMsg = {
								_kind: "com.ericblade.synergv.immessage:1",
								accountId: args.accountId,
								localTimestamp: parseInt(msg.startTime, 10),
								timestamp: parseInt(msg.startTime, 10),
								folder: sms.from === "Me:" ? "outbox" : "inbox",
								status: "successful",
								messageText: sms.text,
								//from: { addr: sms.from == "Me:" ? username : msg.displayNumber }, // TODO: use sms.from ? also get account Name
								from: { addr: sms.from === "Me:" ? username : msg.phoneNumber },
								// to: [ { addr: sms.from == "Me:" ? msg.displayNumber : username } ], // TODO: use sms.from? also get account Name
								to: [ { addr: sms.from === "Me:" ? msg.phoneNumber : username } ],
								serviceName: "type_synergv",
								username: username,
								gConversationId: msg.id,
								delProcessed: false
							};
							if(sms.from === "Me:" && !args.storeOwn) {
								msgsToMerge.push(dbMsg);
							}
							else {
								msgsToStore.push(dbMsg);
							}
						}
					});
				} else {
					var bFound = false;
					for(var x = 0; x < dbResults.length; x++) {
						if(dbResults[x].messageText === msg.messageText)
						{
							bFound = true;
							break;
						}
					}
					if(!bFound) {
						var dbMsg = {
							_kind: "com.ericblade.synergv.immessage:1",
							accountId: args.accountId,
							localTimestamp: parseInt(msg.startTime, 10),
							timestamp: parseInt(msg.startTime, 10),
							folder: "inbox",
							status: "successful",
							messageText: msg.messageText,
							//from: { addr: msg.displayNumber },
							from: { addr: msg.phoneNumber },
							to: [ { addr: username } ],
							serviceName: "type_synergv",
							username: username,
							gConversationId: msg.id,
							delProcessed: false
						};
						msgsToStore.push(dbMsg);
					}
				}
				f.result = { returnValue: true };
			});
		})).then(function(fut) {
			DB.put(msgsToStore).then(function(wtf) {
				wtf.result = { returnValue: true };
				fut.result = { returnValue: true };
				future.result = { returnValue: true };
			});
			// TODO: we probably want to do something with msgsToMerge, to try to
			// figure out how to update the outgoing message gConversationId in the local database... but.. screw it for now.
		});
	}
});

var sync = Class.create({
	run: function(syncFuture) {
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		var conversationIds = [];
		var mergeIds = [];
		var tempMsgs = [];
		var msgsToStore = [];
		var msgTexts = [];
		var username = this.username;
		var GVclient;
	
		args.markMessagesRead = args.markMessagesRead || assistant.markReadOnSync;
		args.inbox = args.inbox || (assistant.syncInbox === true ? "inbox" : undefined); 
		console.log("sync run start", JSON.stringify(args));
		if(args.accountId === undefined) {
			console.log("sync called with no accountId!!!");
			var actname = args.$activity.name;
			var x = actname.indexOf(":");
			if(x === -1) {
				console.log("unable to pull accountId from activity");
				syncFuture.result = { returnValue: false };
				return syncFuture;
			}
			args.accountId = actname.substr(x+1);
		}
		var query = {
						from: "com.ericblade.synergv.immessage:1",
						orderBy: "_rev",
						desc: true,
						where:
						[
							{ "prop":"folder", "op":"=", "val":"outbox" },
							{ "prop":"status", "op":"=", "val":"pending" }
						]
					};
				// TODO: we really really need to store lastRev in the database somewhere and pull it up on initialization
		if(assistant.lastRev !== undefined && assistant.lastRev !== "undefined")
		{
			query.where.push({ "prop": "_rev", "op":">", "val": this.controller.service.assistant.lastRev });
		}
		
		var dbResults;
		syncFuture.nest(DB.find(query, false, false).then(function(f) {
			dbResults = f.result.results;

			syncFuture.nest(assistant.getGVClientForAccount(args.accountId).then(function(fut) {
				GVclient = fut.result.client;
				PalmCall.call("palm://com.palm.service.accounts/", "getAccountInfo", { accountId: args.accountId }).then(function(fut) {
					username = fut.result.result.username;
					console.log("syncing for user", username);
					f.result = { returnValue: true };
				});
			}));
		}).then(function(f) {
			PalmCall.call("palm://com.ericblade.synergv.service/", "syncDeleted", { accountId: args.accountId }).then(function(fut) {
				fut.result = { returnValue: true };
				f.result = { returnValue: true };
			});
		}).
		then(function(f) {
			var results = dbResults;

			//console.log("pending message search result=", JSON.stringify(results));
			if(results.length === 0) {
				f.result = { returnValue: true };
			}
			for(var x = 0; x < results.length; x++) {
				if(assistant.lastRev === undefined || assistant.lastRev < results[x]._rev)
				{
					console.log("new lastRev=", assistant.lastRev);
					assistant.lastRev = results[x]._rev;
				}
				//console.log("outgoing msg from", results[x].from.addr, "comparing to", username);
				if(results[x].from.addr !== username)
				{
					continue;
				}
				f.nest(PalmCall.call("palm://com.ericblade.synergv.service/", "sendIM", {
					msgId: results[x]._id,
					accountId: args.accountId,
					to: results[x].to[0].addr,
					text: results[x].messageText
				}).then(function(fut) { // TODO: "don't make functions in a loop"
					if(fut.result.returnValue === true)
					{
						if(fut.result.status !== "successful") {
							var dbMsg = {
								_kind: "com.ericblade.synergv.immessage:1",
								accountId: args.accountId,
								localTimestamp: parseInt(new Date().getTime(), 10),
								timestamp: parseInt(new Date().getTime(), 10),
								folder: "system",
								status: "successful",
								messageText: "Message send failure, code: " + fut.result.errorcode + " error msg: " + fut.result.errormsg,
								from: { addr: fut.result.destination },
								to: [ { addr: username } ], 
								serviceName: "type_synergv",
								username: username
								//gConversationId: msg.id
							};
							DB.put([ dbMsg ]);
						}
						mergeIds.push( { "_id": fut.result.msgId, "status": fut.result.status });					
						//fut.result = { returnValue: true };
						if(x >= results.length - 1)
						{
							f.result = { mergeIds: mergeIds, returnValue: true };
						}
					}
				}));
				//mergeIds.push( { "_id": results[x]["_id"], "status": "successful" });
			}
			f.then(function(fut) {
				//console.log("********** all messages to mark successful: ", JSON.stringify(fut.result.mergeIds));
				fut.nest(DB.merge(mergeIds).then(function(mergeFut) {
					//console.log("merge status", JSON.stringify(mergeFut.result));
					mergeFut.result = { returnValue: true };
				}));
			});
		})).then(function(f) {
			console.log("***** retrieving messages from server", JSON.stringify(f.result));
			var start = ( ((args.page || 1) - 1) * 10) + 1;
			GVclient.get(args.firstSync ? 'all' : (args.inbox || 'unread'), { start: start, limit: 10 } ,function(error, response){
			//GVclient.get('all', null ,function(error, response){
			//assistant.GVclient.get('inbox', { limit: 10 }, function(error, response) {
				console.log("***** messages retrieved");
				if(error){
					console.log('Error: ',error);
					console.log('Response: ', response);
				}else{
					console.log('There are %s messages in the unread box. The last %s are: ',response.total, response.messages.length);
					var counter = 0;
					response.messages.forEach(function(msg, index) {
						conversationIds.push(msg.id);
						console.log(msg.isRead ? ' ' : '*', (index+1)+'.', msg.displayStartDateTime, msg.displayNumber);
						PalmCall.call("palm://com.ericblade.synergv.service/", "storeConversation", { conv: msg, accountId: args.accountId, storeOwn: args.firstSync === true });
					});
					f.result = { returnValue: true };
				}
			});			
		}).then(function(f) {
			console.log("****** END OF SYNCFUTURE!!!!!!! Marking read:", JSON.stringify(conversationIds));
			if(args.markMessagesRead && conversationIds.length > 0) {
				PalmCall.call("palm://com.ericblade.synergv.service/", "setMessageFlag", { accountId: args.accountId, flag: "read", id: conversationIds });				
			}
			syncFuture.result = { returnValue: true };
		});
	},
	complete: function() {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		var activity = args.$activity;
		var newact = { };
		//console.log("sync complete starting", JSON.stringify(args));
		console.log("activity received was", JSON.stringify(activity));
		if(activity && activity.name.indexOf("SynerGVOutgoingSync") == 0) {
			if(args.accountId === undefined) {
				return;
			}
			if(activity === undefined) {
				return;
			}
			newact = {
				activityId: activity.activityId,
				restart: true,
				// the docs say you shouldn't have to specify the trigger again .. but you do, apparently
				trigger: {
					key: "fired",
					method: "palm://com.palm.db/watch",
					params: {
						query: {
							from: "com.ericblade.synergv.immessage:1",
							where:
							[
								{ "prop":"folder", "op":"=", "val":"outbox" },
								{ "prop":"status", "op":"=", "val":"pending" }
							],
							limit: 1
						},
						subscribe: true
					}
				}
			};
			if(this.controller.service.assistant && this.controller.service.assistant.lastRev)
			{
				newact.trigger.params.query.where.push({ "prop": "_rev", "op":">", "val": this.controller.service.assistant.lastRev });
			}
			PalmCall.call("palm://com.palm.activitymanager/", "complete",  newact).then(function(f) {
				f.result = { returnValue: true };
			});
		} 
		newact = 
		{
			"start": true,
			"replace": true,
			"activity": {
				"name": "SynerGVIncomingSync",
				"description": "SynerGV incoming message sync",
				"type": {
					"background": true,
					"power": true,
					"powerDebounce": true,
					"explicit": true,
					"persist": true
				},
				"requirements": {
					"internet": true
				},
				"schedule": {
					"precise": true,
					"interval": parseInt(assistant.syncTime / 60, 10) + "m"
				},
				"callback": {
					"method": "palm://com.ericblade.synergv.service/syncAllAccounts",
					"params": {}
				}
			}
		};
		// for some reason, the activity no longer exists by the time we get here, so instead of
		// completing it, we re-create it. i guess.
		PalmCall.call("palm://com.palm.activitymanager/", "create", newact).then(function(f) {
			console.log("sync interval complete completed, restarting sync interval at " + newact.activity.schedule.interval);
			f.result = { returnValue: true };
		}, function(f) {
			console.log("Oh shit, something bad happened, our sync activity is probably dead.");
			// TODO: trigger the app to display an error to the user ?
		});
	}	
});

var syncDeleted = Class.create({
	run: function(future) {
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		var msgIds = [];
		var gConvIds = [];

		console.log("Syncing Deleted Messages");
		args.accountId = args.accountId || "++I3z3oKwiwVdHsD";
		var query = {
						from: "com.ericblade.synergv.immessage:1",
						incDel: true,
						// selecting doesn't allow us to get the _del field .. dammit
						//select: [ "_id", "gConversationId", "_del" ],
						where:
						[
							{ "prop":"accountId", "op":"=", "val":args.accountId },
							{ "prop":"delProcessed", "op":"=", "val":false }
						]
					};
		console.log("query=" + JSON.stringify(query));
		DB.find(query, false, false).then(function(f) {
			//console.log("db result=", JSON.stringify(f.result.results));
			var dbr = f.result.results;
			for(var x = 0; x < dbr.length; x++) {
				if(dbr[x]._del) {
					msgIds.push({ "_id": dbr[x]._id, "delProcessed": true});
					if(gConvIds.indexOf(dbr[x].gConversationId) == -1)
					{
						console.log("should archive " + dbr[x].gConversationId);
						gConvIds.push(dbr[x].gConversationId);
					}
				}
			}
			if(msgIds.length > 0) {
				DB.merge(msgIds);
			}
			if(gConvIds.length > 0) {
				if(assistant.deleteAction == "Archive") {
					PalmCall.call("palm://com.ericblade.synergv.service/", "setMessageFlag", {
						accountId: args.accountId,
						flag: "archive",
						id: gConvIds
					}).then(function(f) {
						future.result = { returnValue: true };
						f.result = { returnValue: true };
					});
				} else {
					future.result = { returnValue: true };
				}
			} else {
				future.result = { returnValue: true };
			}
		});
		return future;
	}
});

var syncAllAccounts = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var q = { select: ["accountId"], from: "com.ericblade.synergv.configuration:1" };
		DB.find(q, false, false).then(function(f) {
			var results = f.result.results;
			for(var x in results) {
				PalmCall.call("palm://com.ericblade.synergv.service/", "sync", { accountId: results[x].accountId });
			}
			future.result = { returnValue: true };
		});
	}
});

var syncContacts = Class.create({
	setup: function() {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		var future = new Future;
		var username = "";
		var password = "";
		var auth = "";
		var rnrse = "";
		
		console.log("*** syncContacts setup");
		if(args.accountId === undefined)
		{
			args.accountId = "++I4A4r8QkOFL_Na";
			/*var name = args.$activity.name;
			var x = name.indexOf(":")+1;
			if(x == -1) return undefined;
			args.accountId = name.substr(x);*/
		}
		/*if(!assistant.GVclient)
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
				return future;
			}));			
		} else {
			future.result = { returnValue: true };
		}
		return future;*/
	},
	run: function(future) {
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		var dbContacts = [];

		console.log("sync contacts begin " + args.accountId);		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			var GVclient = f.result.client;
			GVclient.getContacts(function(error, contacts) {
				if(error) {
					// error.code = 10 message=GOOGLE_CLIENTLOGIN_ERROR - incorrect userid/password
					// error.code = 11 message=REQUEST_ERROR - wifi off					
					console.log("error retrieving contacts " + JSON.stringify(error));
					future.setException(Foundations.Err.create(error.code, error.message));
					future.result = { returnValue: false, errorCode: error.code, errorText: error.message };
				} else {
					//console.log("Contacts received", JSON.stringify(contacts));
					contacts.forEach(function(contact, index) {
						var c = 
						{
							_kind: "com.ericblade.synergv.contact:1",
							remoteId: contact.contactId,
							accountId: args.accountId,
							nickname: contact.name,
							imBuddy: true, // IF YOU DON'T HAVE THIS AND YOU'RE AN IM TRANSPORT, THINGS GET REALLY WEIRD IN THE MESSAGING APP!
							phoneNumbers: [], // filled in later
							ims: [], // filled in later
							emails: [], // filled in later
							photos: [] // filled in later
						};
						contact.emails.forEach(function(em, index) {
							c.emails.push({
								type: "type_email",
								value: em
							});
						});
						contact.numbers.forEach(function(pn, index) {
							var type = "type_mobile";
							switch(pn.phoneType) {
								case "work":
									type = "type_work";
									break;
								case "home":
									type = "type_home";
									break;
								case "mobile":
									type = "type_mobile";
									break;
								default:
									type = "type_other";
									break;
							}
							c.phoneNumbers.push({ type: type, value: pn.phoneNumber });
                            c.phoneNumbers.push({ type: type, value: pn.displayNumber });
							//c.ims.push({ serviceName: "type_synergv", type: "type_synergv", label: "Google Voice", value: pn.displayNumber });
							c.ims.push({ serviceName: "type_synergv", type: "type_synergv", label: "type_other", value: pn.phoneNumber });
						});
						try {
							fs.mkdirSync('/media/internal/.synergvimages', 0777);
						} catch(err) {
							
						}
						/*if(contact.photoUrl && contact.photoUrl != "") {
							console.log("retrieving picture with auth " + assistant.GVclient.config.authToken);
							console.log("picture is at https://www.google.com/s2" + contact.photoUrl);
							PalmCall.call("palm://com.ericblade.synergv.service", "httpsRequest", {
								host: "www.google.com",
								path: "/s2" + contact.photoUrl + "?sz=32",
								method: "GET",
								headers: {
									"Authorization":"GoogleLogin auth=" + assistant.GVclient.config.authToken
								},
								savefile: "/media/internal/.synergvimages/" + contact.contactId + ".jpg",
								binary: true
							});
							c.photos.push({
								value: "https://www.google.com/s2/ " + contact.photoUrl,
								type: "type_square",
								localPath: "/media/internal/.synergvimages/" + contact.contactId + ".jpg"
							});
						}*/
						dbContacts.push(c);
						//console.log(JSON.stringify(c));
					});
					DB.put(dbContacts).then(function(f) {
						console.log("put", f.result.results.length, "contacts");
						future.result = f.result; //{returnValue: true };//f.result;
					});
				}
			});
		}));
		
		// TODO: contact sync to server -- this method doesn't give us ability to sync all the phone numbers, as far as i know, so
		// we could end up really pissing people off by mucking with their contacts data making everyone's numbers mobile.
		
		/*var dbq = {
			from: "com.ericblade.synergv.contact:1",
		};
		
		future.nest(DB.find(dbq, false, false).then(function(f) {
			var dbr = f.result.results;
			for(var x = 0; x < dbr.length; x++) {
				var params = {
					accountId: args.accountId,
					phoneNumber: dbr[x].ims[0].phoneNumber,
					name: dbr[x].nickname,
					phoneType: "MOBILE",
				};
				if(dbr[x].remoteId) {
					params.focusId = dbr[x].remoteId;
				}
				PalmCall.call("palm://com.ericblade.synergv.service/", "setContactInfo", params);
			}
			future.result = { returnValue: true };
			console.log("sent " + x + " contacts");
		}));*/
		return future;
	}
});

var downloadVoicemail = Class.create({
	run: function(future) {
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		
		console.log("downloading voicemail for " + args.msgId + " to " + args.fileName);
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			var GVclient = f.result.client;
			GVclient.download({id: args.msgId }, function(err, httpResponse, body){
				if(err){
					future.result = { returnValue: false, errorText: err };
					console.log('Error downloading message ', args.msgId,':',err);
				}else{
					console.log('Downloaded ', args.fileName, JSON.stringify(httpResponse), err);
					try {
						fs.writeFileSync(args.fileName, body, 'binary');
					} catch(err) {
						console.log("Failed to write to ", args.fileName);
					}
					f.result = { returnValue: true, file: args.fileName };
					future.result = { returnValue: true, file: args.fileName };
				}
			});			
		}));
		return future;
	}
});

var createVoicemailDir = Class.create({
	run: function(future) {
		fs.mkdirSync('/media/internal/.synergv', 0777);
		future.result = { returnValue: true };
	}
});

function deleteDirRecursive(path, failSilent) {
    var files;

    try {
        files = fs.readdirSync(path);
    } catch (err) {
        if(failSilent) {
			return;
		}
        throw new Error(err.message);
    }

    /*  Loop through and delete everything in the sub-tree after checking it */
    for(var i = 0; i < files.length; i++) {
        var currFile = fs.lstatSync(path + "/" + files[i]);

        if(currFile.isDirectory()) { // Recursive function back to the beginning
            exports.rmdirSyncRecursive(path + "/" + files[i]);
		}

        else if(currFile.isSymbolicLink()) { // Unlink symlinks
            fs.unlinkSync(path + "/" + files[i]);
		}

        else {// Assume it's a file - perhaps a try/catch belongs here?
            fs.unlinkSync(path + "/" + files[i]);
		}
    }

    /*  Now that we know everything in the sub-tree has been deleted, we can delete the main
        directory. Huzzah for the shopkeep. */
    return fs.rmdirSync(path);
}

var deleteVoicemailDir = Class.create({
	run: function(future) {
		deleteDirRecursive("/media/internal/.synergv");
		future.result = { returnValue: true };
	}
});

var httpsRequest = Class.create({
	run: function(future)
	{
		var args = this.controller.args;
		if(https === undefined)
		{
			console.log("https using curl?");
			var host = args.host || "www.google.com";
			var port = args.port || "443";
			var path = args.path || "/";
			
			var url = "https://" + host + ":" + port + path;
			var cmd = "curl -k ";
			
			if(args.cookies) {
				cmd += ' -b "' + args.cookies + '"';
			}
			if(args.headers) {
				var h;
				for(h in args.headers)
				{
					cmd += ' -H "' + h + ':' + args.headers[h] + '"';
				}
			}
			if(args.savefile) {
				cmd += " -s -o " + args.savefile;
			}
	
			cmd += " " + url;
			console.log("Download command: " + cmd);
			var child = child_process.exec(cmd, function(error, stdout, stderr) {
				future.result = { returnValue: error == null, data: stdout, file: args.savefile };
			});
			return;
		}
		console.log("https using node");
			/* We're going to be receiving a bunch of data over time, this will cache it
			* all until we're done
			*/
		var recdata = "";
		/* Set our connection options */
		var options = {
			host: args.host ? args.host : "www.google.com",
			port: args.port ? args.port : 443,
			path: args.path ? args.path : "/",
			method: args.method ? args.method : "GET"
		};
		/* If client passed us headers, set them */
		if(args.headers) {
			options.headers = args.headers;
		}
		/* NOW: start a https request, this will sit here and wait until the "end"
		* callback is triggered
		*/
		future.now(function(thisfuture) {
			/* Some logging to make sure we're alive -- tail -f /var/log/messages to
			* watch for service logs
			*/
			console.log("HOST:", options.host, "PORT:", options.port);
			/* Call to the Node library to perform the https request -- This will
			* not actually start processing until we fire request.end()
			*/
			var request = https.request(options,
				function(result) {
					/* When we receive data, concat it to the recdata cache, throw a
					* log just so the operator can see we're alive
					*/
					result.on("data",
						function(data) {
							recdata += data;
							console.log("received some data");
						}
					);
					if(args.binary) {
						result.setEncoding('binary');
					}
					/* The future will not return until we set thisfuture.result,
					* which we'll do when we receive the "end" from the https
					* request
					*/
					result.on("end",
						function() {
							console.log("received end of data");
							if(args.savefile) {
								fs.writeFileSync(args.savefile, recdata, args.binary ? 'binary' : 'utf8');
							}
							thisfuture.result = { data: recdata, file: args.savefile, returnValue: true };
						}
					);
					/* Connection closed before we got an end? Let's see what data
					* we did get.
					* www.google.com gives me this event, while developer.palm.com
					* gives me a proper "end"
					*/
					result.on("close",
						function() {
							console.log("received connection closed");
							if(args.savefile) {
								fs.writeFileSync(args.savefile, recdata, args.binary ? 'binary' : 'utf8');
							}
							thisfuture.result = { data: recdata, file: args.savefile, returnValue: true };
						}
					);
				});
			/* Once we have the pending request object, if we have data to send,
			* then send it
			*/
			if(options.method === "POST" && options.postdata) {
				request.write(querystring.stringify(options.postdata));
			}
			/* Flag that the request is all setup, and now Node will fire it */
			request.end();
		});  
	}
});

var fetchAuthKey = Class.create({
	run: function(future)
	{
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		
		PalmCall.call("palm://com.palm.keymanager/", "fetchKey", { "keyname": "GVAuth:" + args.accountId }).then(function(f) {
			auth = Base64.decode(f.result.keydata);
			future.result = { returnValue: true, auth: auth };
		});
		return future;
	}
});

var getGVSettings = Class.create({
	run: function(future) {
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			var GVclient = f.result.client;
			GVclient.getSettings(function(err, settings) {
				future.result = { returnValue: true, settings: settings };
				//fs.writeFileSync("/media/internal/gvsettings.json", JSON.stringify(future.result));
			});
		}));
		return future;
	}
});

var startCall = Class.create({
	run: function(future) {
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			var GVclient = f.result.client;
			GVclient.connect('call',{outgoingNumber:args.outgoingNumber, forwardingNumber:args.forwardingNumber, phoneType:args.phoneType}, function(error, response, body){
				var data;
				try {
					data = JSON.parse(body);
				} catch(err) {
					data = {};
				}
				if(error || !data.ok){
					console.log('Error: ', error, ', response: ', body);
					future.result = { returnValue: false, error: error };
				}else{
					console.log('Call placed.');
					future.result = { returnValue: true, error: error };
				}
			});			
		}));
		return future;
	}
});

var cancelCall = Class.create({
	run: function(future) {
		var assistant = this.controller.service.assistant;
		var args = this.controller.args;
		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			var GVclient = f.result.client;
			GVclient.connect('cancel', null);
			future.result = { returnValue: true };
		}));
		return future;
	}	
});

var editGeneralSettings = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		console.log("editGeneralSettings", JSON.stringify(args));
		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			console.log("sending with client ", JSON.stringify(f.result.client));
			var client = f.result.client;
			client.connect('settings', args.options, function(error, response, body) {
				var data;
				try {
					data = JSON.parse(body);
				} catch(err) {
					data = {};
				}
				var errormsg = "";
				if(error || !data.ok) {
					console.log("Error: ", error);
					console.log("body: ", body);
					console.log("data.ok: ", data.ok);
					console.log("data.code: ", data.data.code);
					future.result = { errorcode: data.data.code, errormsg: errormsg,
										returnValue: false };
				} else {
					console.log("Settings changed");
					future.result = { returnValue: true };
				}
			});
		}));
		
		return future;
	}
});

var setMessageFlag = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		console.log("setMessageFlag", JSON.stringify(args));
		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			var client = f.result.client;
			var options = { };
			options.id = args.id;
			if(args.note) {
				options.note = args.note;
			}
			if(args.transcript) {
				options.transcript = args.transcript; // TODO: saveTranscript ?! neat
			}
			if(args.email) {
				options.email = args.email;
			}
			if(args.subject && args.email) {
				options.subject = args.subject;
			}
			if(args.body && args.email) {
				options.body = args.body;
			}
			if(args.link && args.email) {
				options.link = args.link;
			}
			console.log("setMessageFlag options=");
			console.log(JSON.stringify(options));
			client.set(args.flag, options, function(error, response, body) {
				var data;
				//console.log("error=" + error + " response=" + JSON.stringify(response) + " body=" + body);
				if(error == "HTTP_ERROR") {
					future.result = { returnValue: false, errormsg: "HTTP Error", errorcode: response.statusCode };
					return;
				}
				try {
					data = JSON.parse(body);
				} catch(err) {
					data = {};
				}
				var errormsg = "";
				if(error || !data.ok) {
					console.log("Error: ", error);
					console.log("body: ", body);
					console.log("data.ok: ", data.ok);
					console.log("data.code: ", data.errorCode);
					future.result = { errorcode: data.errorCode, errormsg: error,
										returnValue: false };
				} else {
					console.log("Settings changed");
					future.result = { returnValue: true };
				}			
			});
		}));
		
		return future;
	}
});

var getBillingCredit = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		console.log("getBillingCredit", JSON.stringify(args));
		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			console.log("sending with client ", JSON.stringify(f.result.client));
			var client = f.result.client;
			client.connect('getBillingCredit', args.options, function(error, response, body) {
				var data;
				try {
					data = JSON.parse(body);
				} catch(err) {
					data = {};
				}
				var errormsg = "";
				if(error || !data.ok) {
					console.log("Error: ", error);
					console.log("body: ", body);
					console.log("data.ok: ", data.ok);
					console.log("data.code: ", data.data.code);
					future.result = { errorcode: data.data.code, errormsg: errormsg,
										returnValue: false };
				} else {
					console.log("Billing Credit received " + JSON.stringify(response.body));
					future.result = { returnValue: true, credit: JSON.parse(response.body) };
				}
			});
		}));
		
		return future;
	},
});

var setContactInfo = Class.create({
	run: function(future) {
		var args = this.controller.args;
		var assistant = this.controller.service.assistant;
		console.log("setContactInfo", JSON.stringify(args));
		
		future.nest(assistant.getGVClientForAccount(args.accountId).then(function(f) {
			console.log("sending with client ", JSON.stringify(f.result.client));
			var client = f.result.client;
			var options = {
				phoneNumber: args.phoneNumber,
				phoneType: args.phoneType,
				name: args.name,
				needsCheck: 1
			};
			if(args.focusId) {
				options.focusId = args.focusId;
				options.syntheticId = "";
			}
			client.connect('setContact', options, function(error, response, body) {
				PalmCall.call("palm://com.ericblade.synergv.service/", "syncContacts", { accountId: args.accountId });
				future.result = { returnValue: true, response: JSON.parse(response.body) };
			});
		}));
		
		return future;
	}
});