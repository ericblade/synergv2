// TODO: how did we forget to add a DoNotDisturb indicator to somewhere obvious in the app?
// client.set('saveTranscript', { id:'id', transcript: null})
// TODO: Search full Just Type doesn't launch if app already open. try other commands as well!
// TODO: Search should launch straight to the search page instead of loading Inbox first

// likely can't block people because we have isIMBuddy set. What did that do?

// TODO: if app starts up with no internet connection, it just remains grey screened :(
// TODO: attempt to merge gConversationId and timestamp for outgoing messages, when we sync in, then we can sync in the remaining ones?
// TODO: investigate using a revSet on the _del property on messages to detect when they are deleted
// 		 setup an activity to fire on internet available to archive/delete messages on server when they are deleted locally, rather
//		 than doing it straight off.  where else could we make use of that technique? (do we need it to be persistent in case of a reboot before internet is back on?)
// TODO: rewrite startup so we don't have to wait for messages to load before going to work
// settings.settings.smsNotifications contains an array of { address: '+phone number', active: false } that describe the current sms forwarding status for each phone
// TODO: Changing the sync time needs to re-set the alarm time immediately for all accounts
// TODO: load contacts into memory at app start, etc
// TODO: add a button to Email Notifications menu that will open the Voice email configuration page
// TODO: isSpam determines block status -- if they can be blocked (ie they aren't one of your forwarding numbers), they'll be marked Spam and blocked.
// 		removing Spam attribute removes block -- INVESTIGATE IF THIS IS TRUE. Block sends to Spam, but does Spam auto block??

// Note to self, can we add a .custom notifications. Option sometime, by inserting our messages with flags.read true, then handling it by calling the app to open a dash?
// TODO: we could call getSettings in checkCredentials, and store the phone number of the account in our information .. ?
// TODO: implement the entirety of node-google-voice's client.set() functions
// TODO: add a mode that will sync any pages loaded in app into the Messaging database?
// TODO: why do i have to set the index-selected style on the box inside the item, instead of the whole item?

// TODO: take the result from getSettings, and break it down to enyo.application.settings and enyo.application.phones, so we don't have enyo.application.settings.settings
// TODO: do soemthing with settings.groups, settings.smsNotifications, settings.greetings ?

enyo.kind({
	name: "synergv.Toaster",
	kind: "enyo.Toaster",
	processClick: function(inSender, inEvent) {
		this.doNotOpen = true;
		setTimeout(enyo.bind(this, function() { this.doNotOpen = false; }), 100);
		this.inherited(arguments);
	},
	open: function() {
		if(!this.isOpen)
			this.inherited(arguments);
	}
});

enyo.kind({
	name: "MessageView",
	kind: "VFlexBox",
	events: {
		"onPlaceCall": "",
		"onCompose": "",
		"onRefresh": "",
		"onRedrawIndex": "",
		"onMap": "",
	},
	published: {
		"message": "",
	},
	components: [
		{ name: "gvapi", kind: "PalmService", timeout: 20000, service: "palm://com.ericblade.synergv.service", onSuccess: "apiSuccess", onFailure: "apiFailure", components:
			[
				{ name: "setMessageFlag" },
			]
		},
		{ name: "sendDataToShare", kind: "PalmService", service: "palm://com.palm.stservice", method: "shareData", onSuccess: "tapSendSuccess", onFailure: "tapSendFailure" },		
		{ name: "NotePopup", kind: "NotePopup", className: "notePopup", onNoteSaved: "saveNote" },
		{ name: "MessageHeader", kind: "Header", className: "message-header", content: "Header", showing: false, },
		{ name: "MessageContent", allowHtml: true, onclick: "toggleToaster" },
		{ name: "TipsContent", allowHtml: true, content:
			"Tips: \
			<p>To bring up options for a message, either tap the message text, or hold down briefly on it's location in the list on the left.<p>\
			<p>SynerGV is Just Type-enabled - go to the webOS Settings tab, and select Just Type. \
			Enable SynerGV Messages and Place call with SynerGV, to be able to search your messages \
			and launch to the call view, right from Just Type!<p> \
			Load up the Contacts app and make sure that all your Google Voice contacts are associated to the correct people -- sometimes \
			Contact Merging isn't as bright as we'd like it to be.<p>\
			Do some of your contacts have numbers instead of names?  Go to the Google Contacts site, and make sure that those contacts have actual names entered - Google Voice doesn't transmit names for contacts that only have Nicknames or Company Names.<p>\
			Want your messages faster? Try the 'Boxcar Notifications' option on the Menu. But please make sure you read the information on that page. :)<p>\
			Want to send a message to one of your Google Voice contacts? You should be able to \
			locate them in Just Type or the webOS Contacts app, then click on the 'IM' box next to their \
			Google Voice contact number (not their main phone number)<p>\
			Want to call back a missed call directly from your webOS 2.2+ Pre3 or Veer? Just tap it on the TouchPad's button to place a call to the originator of whatever message is showing in SynerGV.<p>\
			",
			className: "chat-balloon-system", flex: 1 },
		{ name: "ThreadView", kind: "ThreadView", onclick: "toggleToaster", flex: 1, showing: false },
		{ name: "DebugContent", content: "Debug", showing: false },
		{ name: "PlayBox", kind: "VoicemailView", showing: false },
		{ name: "MenuToaster", lazy: false, className: "menu-toaster", kind: "synergv.Toaster", myOpen: false, flyInFrom: "top", components:
			[
				{ kind: "Toolbar", defaultKind: "GroupedToolButton", components:
					[
						{ kind: "Spacer" },
						{ kind: "ToolButtonGroup", components:
							[
								{ name: "MarkReadButton", caption: "Mark Read", onclick: "toggleRead", },
								{ name: "ArchiveButton", caption: "Archive", onclick: "toggleArchive" },
								{ name: "SpamButton", caption: "Spam", onclick: "toggleSpam", },								
							]
						},
						{ kind: "Spacer" },
						{ kind: "ToolButtonGroup", components:
							[
								{ name: "AddContactButton", icon: "images/contactsaddnew.png", /*caption: "Add Contact",*/ onclick: "openContactPopup" },
								{ name: "MapButton", icon: "images/map_jason_larose.png", /*caption: "Map Location",*/ onclick: "launchMap", },
								{ name: "ComposeButton", icon: "images/Blade_msg1.png", onclick: "startCompose", },
								{ name: "CallButton", icon: "images/Blade_phone1.png", onclick: "placeCall", },
							]
						},
						{ kind: "Spacer" },
						{ kind: "ToolButtonGroup", components:
							[
								{ name: "StarButton", icon: "images/star-button.png", /*caption: "Star",*/ onclick: "toggleStar" },
								{ name: "NoteButton", onclick: "openNote", components:
									[
										{ name: "NoteIcon", kind: "enyo.Image", src: "images/note.png", style: "width: 22px; height: 22px; border: none; padding: 0; margin: 0;" },
									]
								}, 
							]
						},
						{ kind: "Spacer" },
						{ kind: "ToolButtonGroup", components:
							[
								{ name: "DeleteButton", icon: "images/trash-icon.png", /*caption: "Trash",*/ onclick: "toggleTrash" },
								{ name: "DeleteForeverButton", icon: "images/Xbutton.png", onclick: "deletePermanently", },								
							]
						},
						{ kind: "Spacer" },
					]
				}
			]
		},
		{ name: "ContactPopup", caption: "Edit Contact", lazy: false, kind: "Popup", components:
			[
				{ name: "ContactName", kind: "Input", hint: "Contact Name" },
				{ name: "ContactNumber", kind: "Input", hint: "Contact Number" },
				{ name: "ContactPhoneType", kind: "synergv.ListSelector", value: "Mobile", onChange: "phoneSelect", items: [ "Home", "Mobile", "Work"] },
				{ kind: "Button", caption: "Add Contact", onclick: "addContact", className: "enyo-affirmative" },
			]
		},
		{ name: "DeleteToaster", kind: "synergv.DeletePrompt", title: "Permanently Delete Messages",
			message: "You have selected to PERMANENTLY delete the marked conversations. Are you sure? \
			The Trashcan button will move your messages to the Trash folder, where they can be recovered \
			for up to 30 days.",
			acceptButtonCaption: "Delete", cancelButtonCaption: "Cancel", onAccept: "actuallyDeletePermanently",
			onCancel: "closeDeleteToaster",
		},
	],
	closeDeleteToaster: function(inSender, inEvent) {
		this.$.DeleteToaster.close();
	},
	openContactPopup: function(inSender, inEvent) {
		this.$.ContactPopup.open();
		this.$.ContactName.setValue(this.message.fromName);
		this.$.ContactNumber.setValue(this.message.phoneNumber);
		this.$.ContactPhoneType.setValue("Mobile");
	},
	closeContactPopup: function(inSender, inEvent) {
		this.$.ContactPopup.close();
	},
	addContact: function(inSender, inEvent) {
		var name = this.$.ContactName.getValue();
		var num = this.$.ContactNumber.getValue();
		var phone = this.$.ContactPhoneType.getValue().toUpperCase();
		
		if(name && num && phone) {
			this.closeContactPopup();
			this.$.gvapi.call({ accountId: enyo.application.accountId, phoneNumber: num, phoneType: phone, name: name }, { method: "setContactInfo" });			
		}
	},
	launchMap: function(inSender, inEvent) {
		this.$.MenuToaster.close();
		this.doMap(this.message.location);
	},
	openNote: function(inSender, inEvent) {
		this.$.MenuToaster.close();
		this.log();
        this.$.NotePopup.openAtEvent(inEvent);
        this.$.NotePopup.setMessageId(this.message.id);
        this.$.NotePopup.setNote(this.message.note);
        inEvent.preventDefault();
        inEvent.stopPropagation();
        return true;		
	},
	// to me, it only makes sense to have note operate on a single message at a time .. ?
	saveNote: function(inSender, inText) {
		enyo.application.adjustAccessCount(1);
		this.$.setMessageFlag.call({
			accountId: enyo.application.accountId,
			flag: inText.length > 0 ? "saveNote" : "deleteNote",
			id: this.message.id,
			note: inText
		});
	},
	deletePermanently: function(inSender, inEvent) { 
		this.$.MenuToaster.close();
		this.threadsToDelete = enyo.application.selectedIds.length ? enyo.application.selectedIds : [ this.message.id ];
		this.log("querying to delete " + JSON.stringify(this.threadsToDelete));
		this.$.DeleteToaster.open();
		/*enyo.application.adjustAccessCount(1);
		this.$.setMessageFlag.call({
			accountId: enyo.application.accountId,
			flag: "deleteForever",
			id: enyo.application.selectedIds.length ? enyo.application.selectedIds : this.message.id
		});*/
	},
	actuallyDeletePermanently: function() {
		this.$.DeleteToaster.close();
		this.log("actually deleting " + JSON.stringify(this.threadsToDelete));
		enyo.application.adjustAccessCount(1);
		this.$.setMessageFlag.call({ accountId: enyo.application.accountId, flag: "deleteForever", id: this.threadsToDelete });
	},
	toggleTrash: function(inSender, inEvent) {
		this.$.MenuToaster.close();
		enyo.application.adjustAccessCount(1);
		this.$.setMessageFlag.call({
			accountId: enyo.application.accountId,
			flag: "toggleTrash",
			id: enyo.application.selectedIds.length ? enyo.application.selectedIds : this.message.id
		});
	},
	toggleStar: function(inSender, inEvent) {
		this.$.MenuToaster.close();
		enyo.application.adjustAccessCount(1);
		this.$.setMessageFlag.call({
			accountId: enyo.application.accountId,
			flag: this.message.star ? 'unstar' : 'star',
			id: enyo.application.selectedIds.length ? enyo.application.selectedIds : this.message.id
		});
	},
	toggleRead: function(inSender, inEvent) {
		this.$.MenuToaster.close();
		enyo.application.adjustAccessCount(1);
		this.$.setMessageFlag.call({
			accountId: enyo.application.accountId,
			flag: this.message.isRead ? 'unread' : 'read',
			id: enyo.application.selectedIds.length ? enyo.application.selectedIds : this.message.id
		});
	},
	toggleArchive: function(inSender, inEvent) {
		this.$.MenuToaster.close();
		enyo.application.adjustAccessCount(1);
		this.$.setMessageFlag.call({
			accountId: enyo.application.accountId,
			flag: this.message.labels.indexOf("inbox") == -1 ? 'unarchive' : 'archive',
			id: enyo.application.selectedIds.length ? enyo.application.selectedIds : this.message.id
		});
	},
	toggleSpam: function(inSender, inEvent) {
		this.log();
		enyo.application.adjustAccessCount(1);
		this.$.MenuToaster.close();
		this.$.setMessageFlag.call({
			accountId: enyo.application.accountId,
			flag: this.message.isSpam ? 'unspam' : 'spam',
			id: enyo.application.selectedIds.length ? enyo.application.selectedIds : this.message.id
		});
	},
	apiSuccess: function(inSender, inResponse, inRequest) {
		var bDoRefresh = false;
		var msg = "";
		enyo.application.adjustAccessCount(-1);
		enyo.application.selectedIds = [ ];
		this.log("method=", inRequest.method);
		this.log("inResponse=", inRequest.response);
		if(inRequest.method == "setContactInfo") {
			var data = inResponse.response.data;
			if(data.matchingContacts && data.matchingContacts.length > 0 && (inRequest.params && inRequest.params.name.toLower() != data.matchingContacts[0].name.toLower()))
			{
				var params = inRequest.params;
				this.log("original params=", params);
				params.focusId = data.matchingContacts[0].focusId;
				this.$.gvapi.call(params, { method: "setContactInfo" });			
			}
			return;
		}
		switch(inRequest.params.flag) {
			case "saveNote": msg = "Note saved"; this.message.note = inRequest.params.note; this.doRedrawIndex(); break;
			case "deleteNote": msg = "Note deleted"; this.message.note = ""; this.doRedrawIndex(); break;
			case "deleteForever": msg = "Deleted Permanently"; bDoRefresh = true; this.doRedrawIndex(); break;
			case "toggleTrash": msg = "Conversation (un)Trashed"; bDoRefresh = true; break; // TODO: can we seperate trash/untrash functions?!
			case "unstar": this.message.star = false; this.doRedrawIndex(); break;
			case "star": this.message.star = true; this.doRedrawIndex(); break;
			case "unread": this.message.isRead = false; this.doRedrawIndex(); break;
			case "read": this.message.isRead = true; this.doRedrawIndex(); break;
			case "unarchive": msg = "Conversation unarchived"; bDoRefresh = true; break;
			case "archive": msg = "Conversation archived"; bDoRefresh = true; break;
			case "unspam": msg = "Unmarked Spam - Caller Unblocked"; bDoRefresh = true; break;
			case "spam": msg = "Marked Spam - Caller Blocked"; bDoRefresh = true; break;
			default:
				msg = inRequest.params.flag + " succeeded";
				break;
		}
		if(bDoRefresh || Array.isArray(inRequest.params.id)) {
			this.doRefresh();
		} else {
			this.messageChanged(); // resetup the view and menu according to whatever new parameters are set/unset
		}
		if(msg)
			enyo.windows.addBannerMessage(msg, '{}', "images/google-voice-icon24.png");
		
		// TODO (later update?): reload only if (boxPicker == Inbox and flag == Archive) or (flag == Spam or Trash or Delete Permanently), or request was on multiples (inRequest.params.id is array and has length > 1)
		//this.doRefresh();
		this.log(inRequest);
	},
	apiFailure: function(inSender, inError, inRequest) {
		enyo.application.adjustAccessCount(-1);
		switch(inRequest.params.flag) {
			case "saveNote": case "deleteNote":
				msg = "Note save failed";
				break;
			case "deleteForever":
				msg = "Deletion failed";
				break;
			case "toggleTrash":
				msg = "Trash failed";
				break;
			case "star": case "unstar":
				msg = "Star failed";
				break;
			case "unread": case "read":
				msg = "Mark read failed";
				break;
			case "unarchive": case "archive":
				msg = "Archive failed";
				break;
			case "unspam": case "spam":
				msg = "Spam failed";
				break;
			default:
				msg = inRequest.params.flag + " failed";
				break;
		}
		if(inRequest.method == "setContactInfo")
			msg = "Set Contact failed";
		enyo.windows.addBannerMessage(msg, '{}', "images/google-voice-icon24.png");
	},
	toggleToaster: function(inSender, inEvent) {
		if(!this.$.MenuToaster.doNotOpen)
		{
			this.$.MenuToaster.setDismissWithClick(enyo.application.selectedIds.length == 0);
			if(enyo.application.selectedIds.length > 0 || inEvent.clientY > window.innerHeight / 2)
			{
				this.$.MenuToaster.setFlyInFrom("bottom");
				this.$.MenuToaster.openNear({ top: window.innerHeight });
			}
			else
			{
				this.$.MenuToaster.setFlyInFrom("top");
				this.$.MenuToaster.openNear({ top: 0 });
			}
			//this.log("toggleToaster inEvent=", inEvent);
		    //this.$.MenuToaster.open();
		}
		return true;
	},
	closeMenu: function() {
		this.$.MenuToaster.close();
	},
	startCompose: function(inSender, inEvent) {
		var recipients = [ ];
		this.$.MenuToaster.close();
		this.doCompose(this.message.phoneNumber)
	},
	startVoicemail: function(inSender, inEvent) {
		this.$.PlayBox.playPauseClicked(inSender, inEvent);
	},
	placeCall: function(inSender, inEvent) {
		this.$.MenuToaster.close();
		this.log("placeCall", this.message.phoneNumber);
		this.doPlaceCall(inEvent, this.message.phoneNumber);
		return true;
	},
	tapToShare: function() {
		var labels = this.message && this.message.labels;
		var bRead = this.message && this.message.isRead;
		var bArchived = labels && labels.indexOf("inbox") === -1;
		var bSpam = this.message && this.message.isSpam;
		var bStar = this.message && this.message.star;
		var bTrash = this.message && this.message.isTrash;
		var bNote = this.message && this.message.note != "";
		var bVoicemail = labels && labels.indexOf("voicemail") !== -1;
		var bMissed = labels && labels.indexOf("missed") !== -1;
		var bPlaced = labels && labels.indexOf("placed") !== -1;
		var bReceived = labels && labels.indexOf("received") !== -1;
		var bRecorded = labels && labels.indexOf("recorded") !== -1;
		
		var dataToSend = { "target": "tel:" + this.message.phoneNumber, "type": "rawdata", "mimetype": "text/html" };
		this.log("sending url " + dataToSend.target);
        this.$.sendDataToShare.call({"data": dataToSend});			
	},
	messageChanged: function() {
		/*enyo.log("animating node", this.parent.hasNode());
		Firmin.animate(this.parent.hasNode(), {
			//translateX: window.innerWidth,
			opacity: 0,
		}, "0.55s", enyo.bind(this, this.completeMessageChange())).animate({ //translateX: 0,
			opacity: 1 }, "0.55s");*/
		this.completeMessageChange();
		
		enyo.log("Message Changed!", this.message);
	},
	completeMessageChange: function() {
		if(!this.message)
		    this.$.TipsContent.show();
		else
			this.$.TipsContent.hide();
		var labels = this.message && this.message.labels;
		var bRead = this.message && this.message.isRead;
		var bArchived = labels && labels.indexOf("inbox") === -1;
		var bSpam = this.message && this.message.isSpam;
		var bStar = this.message && this.message.star;
		var bTrash = this.message && this.message.isTrash;
		var bNote = this.message && this.message.note != "";
		var bVoicemail = labels && labels.indexOf("voicemail") !== -1;
		var bMissed = labels && labels.indexOf("missed") !== -1;
		var bPlaced = labels && labels.indexOf("placed") !== -1;
		var bReceived = labels && labels.indexOf("received") !== -1;
		var bRecorded = labels && labels.indexOf("recorded") !== -1;
		
		if(this.message && this.message.location)
			this.$.MapButton.setDisabled(false);
		else
			this.$.MapButton.setDisabled(true);
		this.$.MarkReadButton.setCaption(bRead ? "Mark Unread" : "Mark Read");
		this.$.ArchiveButton.setCaption(bArchived ? "UnArchive" : "Archive");
		//this.$.StarButton.setCaption(bStar ? "UnStar" : "Star");
		this.$.StarButton.setIcon(bStar ? "images/unstar-button.png" : "images/star-button.png");
		this.$.SpamButton.setCaption(bSpam ? "UnSpam" : "Spam");
		//this.$.DeleteButton.setCaption(bTrash ? "UnTrash" : "Trash");
		this.$.DeleteButton.setIcon(bTrash ? "images/untrash-icon.png" : "images/trash-icon.png");
		
		this.$.DebugContent.setContent(JSON.stringify(this.message));
		var header = "";
		
		if(bVoicemail)
		    header += "Voicemail from ";
		else if(bMissed)
		    header += "Missed call from ";
		else if(bPlaced)
		    header += "Placed call to ";
		else if(bReceived)
		    header += "Received call from ";
		else if(bRecorded)
			header += "Recorded call with ";
		else
		    header += "Conversation with ";
			
		if(bVoicemail || bRecorded || (this.message && this.message.hasMp3) ) {
			this.$.PlayBox.show();
			this.$.PlayBox.setMessage(this.message);
		} else {
			this.$.PlayBox.setMessage(undefined);
			this.$.PlayBox.hide();
		}
		this.$.MessageContent.addRemoveClass("chat-balloon-voicemail", bVoicemail);
		this.$.MessageContent.addRemoveClass("chat-balloon-missed", bMissed);
		this.$.MessageContent.addRemoveClass("chat-balloon-placed", bPlaced);
		this.$.MessageContent.addRemoveClass("chat-balloon-received", bReceived);
			
		if(this.message && this.message.messageText) {
			this.$.MessageContent.show();
			this.$.MessageContent.setContent((bVoicemail ? "Transcription: " : "") + this.message.messageText);
			this.$.MessageHeader.show();
		} else if(bMissed || bPlaced || bReceived) {
			this.$.MessageContent.show();
			this.$.MessageContent.setContent(header + this.message.fromName + " at " + this.message.displayStartDateTime + " (" + this.message.relativeStartTime + ")");
			this.$.MessageHeader.hide();
		} else {
			this.$.MessageContent.hide();
			this.$.MessageHeader.show();
		}
		
		if(this.message && this.message.thread) {
			this.$.ThreadView.show();
			this.$.MessageContent.hide();
		}
		
		if(this.message && this.message.note !== "") {
			this.$.NoteIcon.setSrc("images/note.png");
		} else {
			this.$.NoteIcon.setSrc("images/unnote.png");
		}
		
		this.$.ThreadView.setThread(this.message && this.message.thread);
		
		if(this.message)
		    header += this.message.fromName + " @ " + this.message.displayStartDateTime;
		if(this.message && this.message.duration) {
		    header += " (" + this.message.duration +" seconds)";
		}
		
		this.$.MessageHeader.setContent(header);
		if(!this.message) {
			this.$.MessageHeader.hide();
		}
		
		this.render();
	}
});

enyo.kind({
	name: "ThreadView",
	kind: "VFlexBox",
	components: [
		{ name: "ThreadScroller", kind: "Scroller", flex: 1, components:
			[
				{ name: "ThreadRepeater", kind: "VirtualRepeater", onSetupRow: "setupRow", components:
					[
						{ name: "MessageContainer", components:
							[
								{ name: "MsgText" },
								{ name: "TimeStamp", className: "enyo-item-ternary" },
							]
						},
					]
				},
			]
		},
	],
	published: {
		thread: "",
	},
	threadChanged: function() {
		this.$.ThreadRepeater.render();
		this.$.ThreadScroller.scrollToBottom();
	},
	setupRow: function(inSender, inRow) {
		if(this.thread && this.thread[inRow]) {
			this.$.MsgText.setContent(this.thread[inRow].text);
			this.$.TimeStamp.setContent(this.thread[inRow].time);
			this.$.MessageContainer.addRemoveClass("chat-balloon-received", this.thread[inRow].from !== "Me:");
			this.$.MessageContainer.addRemoveClass("chat-balloon-sent", this.thread[inRow].from === "Me:");
			return true;
		}
		return false;
	}
});

enyo.kind({
	name: "MainView",
	kind: enyo.VFlexBox,
	events: {
		"onSettingsReceived": "",
		"onSetPages": "",
		"onSetBox": "",
	},
	components: [
		{ name: "gvapi", kind: "PalmService", service: "palm://com.ericblade.synergv.service", onSuccess: "apiSuccess", onFailure: "apiFailure", components:
			[
				{ name: "getVoiceMessages", method: "getVoiceMessages" },
			]
		},
		{ name: "getGVSettings", kind: "PalmService", service: "palm://com.ericblade.synergv.service", method: "getGVSettings", onSuccess: "settingsReceived", onFailure: "settingsFailed" },
		{ name: "LaunchMessaging", kind: "PalmService", service: "palm://com.palm.applicationManager", method: "launch" },
		{ name: "Slider", kind: "SlidingPane", flex: 1, components:
			[
				{ name: "LeftView", width: "320px", kind: "SlidingView", components:
					[
						{ name: "SearchInput", kind: "enyo.SearchInput", onkeypress: "searchKeypress", onclick: "searchClick" },
						{ kind: "Scroller", flex: 1, components:
							[
								{ name: "NoMessagesMessage", showing: false, components:
									[
										{ content: "No messages were loaded. If you feel you have reached this message in error, please press the Refresh button." },
										{ kind: "Button", caption: "Refresh", onclick: "render" },
									]
								},
								{ name: "IndexRepeater", kind: "VirtualRepeater",
									onSetupRow: "setupIndexRow", onclick: "selectIndex", components:
									[
										{ name: "IndexItem", tapHighlight: false, kind: "ThreeButtonSwipeableItem", lazy: false, layoutKind: "HFlexLayout",
											onConfirm: "deleteMessage", onArchive: "archiveMessage", onmousehold: "indexHeld", components:
											[
												//{ name: "IndexImage" }
												{ name: "IndexBox", kind: "VFlexBox", pack: "center", flex: 1, components:
													[
														{ kind: "HFlexBox", components:
															[
																{ name: "IndexName", className: "index-name" },
																{ name: "IncomingCallIndicator", className: "indicator", kind: "enyo.Image", src: "images/receivedcallind.png", showing: false },
																{ name: "OutgoingCallIndicator", className: "indicator", kind: "enyo.Image", src: "images/placedcallind.png", showing: false },
																{ name: "MissedCallIndicator", className: "indicator", kind: "enyo.Image", src: "images/missedcallind.png", showing: false },
																{ name: "RecordedCallIndicator", className: "indicator", kind: "enyo.Image", src: "images/recordedcallind.png", showing: false },
																{ name: "NoteIndicator", className: "indicator", kind: "enyo.Image", src: "images/note.png", showing: false, },
																{ name: "VoiceMailIndicator", className: "indicator", kind: "enyo.Image", src: "images/Blade_voice2.png", showing: false, },
																{ name: "StarIndicator", className: "indicator", kind: "enyo.Image", src: "images/star.png", showing: false, },
															]
														},
														{ name: "IndexLocation", className: "enyo-item-ternary enyo-text-ellipsis index-location", }, 
														{ name: "IndexMessage", className: "enyo-item-ternary enyo-text-ellipsis index-message", },
														{ name: "IndexTime", className: "enyo-item-secondary index-time" },
													]
												},
												{ kind: "HFlexBox", align: "center", components:
													[
														{ name: "PlayVoicemailButton", kind: "ToolButton", icon: "images/voicemail.png", showing: false, onclick: "playVoicemail" },
														{ name: "PlaceCallButton", kind: "ToolButton", icon: "images/phone.png", showing: false, onclick: "placeCall", },
														{ name: "ComposeButton", kind: "ToolButton", icon: "images/newtext.png", showing: false, onclick: "composeText", },
														{ name: "SelectCheckBox", kind: "CheckBox", className: "index-checkbox", onclick: "toggleSelection" },
													]
												}
											]
										}
									]
								}
							]
						}
					]
				},
				{ name: "RightView", kind: "SlidingView", components:
					[
						{ name: "RightPane", kind: "Pane", transitionKind: "TestTransition", flex: 1, components:
							[
								{ name: "MessageView", kind: "MessageView", onPlaceCall: "placeCall",
									onCompose: "composeMessage", onRefresh: "render",
									onRedrawIndex: "renderIndex", onMap: "launchMap" },
								{ name: "VoicemailView", kind: "VFlexBox", components:
									[
										{ name: "VoicemailPlayer", kind: "VoicemailView", flex: 1 },
									]
								},
								{ name: "TelephoneView", kind: "TelephoneView", onBack: "RightViewBack" },
								{ name: "ComposeView", kind: "VFlexBox", components:
									[
										{ name: "ComposeContent", content: "Compose Text" },
									]
								},
								{ name: "AboutView", kind: "AboutView", onBack: "RightViewBack" },
							]
						},
					]
				}
			]
		}
	],
	openAbout: function() {
		this.$.RightPane.selectViewByName("AboutView");
	},
	doSearch: function(str) {
		enyo.application.adjustAccessCount(1);		
		this.$.getVoiceMessages.call(
			{
				accountId: enyo.application.accountId,
				inbox: "search",
				query: str,
				page: enyo.application.inboxPage ? enyo.application.inboxPage : 1,
			});		
	},
	searchKeypress: function(inSender, inEvent) {
		if(inEvent && inEvent.keyCode == 13) {
			this.doSearch(this.$.SearchInput.getValue());
			return true;
		}
		return false;
	},
	searchClick: function(inSender, inEvent) {
		this.log();
		this.doSetBox("Search");
	},
	tapToShare: function() {
		this.$.RightPane.getView().tapToShare();
	},
	indexHeld: function(inSender, inEvent) {
		this.selectIndex(inSender, inEvent);
		this.$.MessageView.toggleToaster(inSender, inEvent);
		return true;		
	},
	launchMap: function(inSender, inLocation) {
		this.$.LaunchMessaging.call({ target: "maploc:" + inLocation }, { method: "open" });
	},
	settingsFailed: function() {
		this.log("*** Settings retrieval failed .. will try again soon");
		enyo.application.adjustAccessCount(-1);		
	},
	renderIndex: function() {
		this.$.IndexRepeater.render();
	},
	toggleSelection: function(inSender, inEvent) {
		//this.$.IndexRepeater.controlsToRow(inEvent.inRow);
		//this.$.SelectCheckBox.setChecked(!this.$.SelectCheckBox.getChecked());
		this.log(inSender, inEvent);
		this.selectRow(inEvent.rowIndex);
		if(!enyo.application.selectedIds)
		    enyo.application.selectedIds = [ ];
		if(enyo.application.selectedIds.indexOf(this.messages[inEvent.rowIndex].id) === -1)
		{
			enyo.application.selectedIds.push(this.messages[inEvent.rowIndex].id);
			this.$.SelectCheckBox.setChecked(true);
		} else {
			var index = enyo.application.selectedIds.indexOf(this.messages[inEvent.rowIndex].id);
			this.log("deleting index ", index, " from selectedIds before=", enyo.application.selectedIds);
			enyo.application.selectedIds.splice(index, 1);
			this.log("after=", enyo.application.selectedIds);
			this.$.SelectCheckBox.setChecked(false);
		}
		this.log("selection: ", enyo.application.selectedIds);
		if(enyo.application.selectedIds.length > 0) {
			this.$.MessageView.toggleToaster(inSender, inEvent);
		} else {
			this.$.MessageView.closeMenu();
		}
		inEvent.stopPropagation();
		return true;
	},
	settingsReceived: function(inSender, inResponse, inRequest) {
		enyo.application.adjustAccessCount(-1);		
		if(!this.messages) {
			enyo.application.adjustAccessCount(1);
			
				this.$.getVoiceMessages.call({ accountId: enyo.application.accountId,
							  inbox: enyo.application.inbox ? enyo.application.inbox.toLowerCase() : "inbox",
							  page: enyo.application.inboxPage ? enyo.application.inboxPage : 1,
							  });
		}
		//enyo.log("** Settings Received! ", inResponse.settings);
		var phones = [];
		enyo.application.settings = inResponse.settings;
		for(var x in enyo.application.settings.phones) {
			phones.push(enyo.application.settings.phones[x]);
		}
		//enyo.log("** Settings received: phones=", phones);
		enyo.application.phones = phones;
		this.$.TelephoneView.setPhones(phones);
		this.doSettingsReceived();
	},	
	RightViewBack: function() {
		this.$.RightPane.back();
	},
	create: function() {
		this.inherited(arguments);
	},
	rendered: function() {
		this.inherited(arguments);
		enyo.log("rendered");
		if(enyo.application.accountId)
		{
			enyo.scrim.show();
			if(!enyo.application.settings || !enyo.application.phones) {
				enyo.application.adjustAccessCount(1);
				
				this.$.getGVSettings.call({ accountId: enyo.application.accountId });
			}
			else { // if we're getting settings, we'll delay this till after we get settings
				enyo.application.adjustAccessCount(1);
				this.$.getVoiceMessages.call({ accountId: enyo.application.accountId,
							  inbox: enyo.application.inbox ? enyo.application.inbox.toLowerCase() : "inbox",
							  page: enyo.application.inboxPage ? enyo.application.inboxPage : 1,
							  });
			}
		}
	},
	changeGeneralSettings: function(setting) {
		enyo.application.adjustAccessCount(1);
		this.$.gvapi.call({
			accountId: enyo.application.accountId,
			options: setting,
		}, { method: "editGeneralSettings" } );
	},
	syncList: function() {
		enyo.application.adjustAccessCount(1);
		this.$.gvapi.call({
			accountId: enyo.application.accountId,
			inbox: enyo.application.inbox ? enyo.application.inbox.toLowerCase() : "inbox",
			page: enyo.application.inboxPage ? enyo.application.inboxPage : 1,
		}, { method: "sync" });
	},
	apiSuccess: function(inSender, inResponse, inRequest) {
		this.log("inResponse total", inResponse.total, inResponse.resultsPerPage);
		enyo.application.adjustAccessCount(-1);
		enyo.scrim.hide();
		if(inRequest.method == "getVoiceMessages") {
			var oldSelectedId = (this.messages && this.selectedIndex !== undefined && this.messages[this.selectedIndex]) ? this.messages[this.selectedIndex].id : -1;
			this.log("Prior Selected id=", oldSelectedId);
			var iFound = -1;
			this.selectRow(-1);
			this.messages = inResponse.messages;
			if(!this.messages || this.messages.length === 0)
			{
				this.$.NoMessagesMessage.show();
			} else {
				this.$.NoMessagesMessage.hide();
			}
			var tempIds = [];
			// loop through each of the selected ids, if they are in the newly loaded view, add them to a list of ids that will remain selected
			// select whatever one was last selected, if it's still there, or the first one still in the selected list, or 0
			if(this.messages) {
				for(var y = 0; y < this.messages.length; y++) {
					if(this.messages[y].id == oldSelectedId)
						iFound = y;
					for(var x = enyo.application.selectedIds && enyo.application.selectedIds.length - 1; x >= 0; x--) {
						if(this.messages[y].id == enyo.application.selectedIds[x])
						{
							if(iFound == -1)
								iFound = y;
							tempIds.push(this.messages[y].id);
						}
					}
				}
			}
			if(this.messages) {
				this.log("setting pages", Math.ceil(inResponse.total / inResponse.resultsPerPage));
				this.doSetPages(Math.ceil(inResponse.total / inResponse.resultsPerPage));
			}
			// enyo.application.selectedIds = tempIds;
			enyo.application.selectedIds = [ ];
			// select the first one that was still in the list, or the first one in the list if none
			this.$.IndexRepeater.render();
			if(oldSelectedId != -1)
				this.selectRow(iFound > -1 ? iFound : 0);
		}
		if(inRequest.method == "editGeneralSettings") {
			enyo.log("editGeneralSettings response: ", inResponse);
			// reload our settings, after making changes to them
			this.$.getGVSettings.call({ accountId: enyo.application.accountId });			
		}
		this.processCommands();
	},
	processCommands: function() {
		if(enyo.application.accountId && enyo.application.commands.length > 0) {
			var cmds = enyo.application.commands;
			for(var x = 0; x < cmds.length; x++) {
				switch(cmds[x].cmd) {
					case "playVoicemail": 
						this.$.RightPane.selectViewByName("VoicemailView");
						this.$.VoicemailPlayer.setMessageId(cmds[x].msgId);
						this.$.VoicemailPlayer.playPauseClicked();
						enyo.application.commands = [ ]; // ok, interactive commands halt any others when processed, i guess
						break;
					case "placecall":
						this.$.RightPane.selectViewByName("TelephoneView");
						this.$.TelephoneView.setPhoneNumber(cmds[x].msgId);
						enyo.application.commands = [ ];
						break;
					case "search":
						this.doSetBox("Search");
						this.$.SearchInput.setValue(cmds[x].msgId);
						this.doSearch(cmds[x].msgId);
						enyo.application.commands = [ ];
						break;
					default:
						break;
				}
			}
		}
	},
	apiFailure: function(inSender, inError, inRequest) {
		enyo.application.adjustAccessCount(-1);		
		enyo.scrim.hide();
		enyo.log("apiFailure:", inError);
		enyo.log("apiFailure request:", inRequest);
	},
	playVoicemail: function(inSender, inEvent) {
		this.selectIndex(inSender, inEvent);
		this.$.MessageView.startVoicemail(inSender, inEvent);
		return true;
	},
	placeCall: function(inSender, inEvent, inPhoneNumber) {
		if(!inPhoneNumber && inEvent.rowIndex)
		    inPhoneNumber = this.messages[inEvent.rowIndex].phoneNumber;
		this.log(inPhoneNumber);
		this.$.RightPane.selectViewByName("TelephoneView");
		if(inPhoneNumber)
		    this.$.TelephoneView.setPhoneNumber(inPhoneNumber);
		this.$.TelephoneView.render();
		return true;
	},
	composeMessage: function(inSender, inRecp) {
		var recipients = [];
		if(Array.isArray(inRecp)) {
			for(var x = 0; x < inRecp.length; x++) {
				recipients.push({ address: inRecp[x], serviceName: "type_synergv" });
			}
		} else {
			recipients.push({ address: inRecp, serviceName: "type_synergv" });
		}
		this.$.LaunchMessaging.call({
			id: "com.palm.app.messaging",
			params: {
				composeRecipients: recipients,
			}
		});
	},
	composeText: function(inSender, inEvent) {
		// TODO (later revision): implement internal compose message function
		this.$.RightPane.selectViewByName("ComposeView");
		return true;
	},
	setupIndexRow: function(inSender, inRow) {
		if(this.messages && this.messages.length > inRow) {
			var message = this.messages[inRow];
			if(!message) return false;
			var name = "";
			if(message.thread) {
				for(var x = 0; x < message.thread.length; x++) {
					if(message.thread[x].from !== "Me:") {
						name = message.thread[x].from.substr(0, message.thread[x].from.length - 1);
						break;
					}
				}
			}
			if(name === "")
			    name = message.displayNumber || "Unknown Caller";
				
			if(enyo.application.selectedIds.indexOf(message.id) !== -1)
			    this.$.SelectCheckBox.setChecked(true);
			if(this.messages && this.messages[inRow])
				this.messages[inRow].fromName = name;

			this.$.IndexBox.addRemoveClass("index-selected", this.selectedIndex === inRow);
			
			this.$.IndexName.setContent(name);
			this.$.IndexTime.setContent(message.displayStartDateTime);
			
			this.$.IndexItem.addRemoveClass("index-unread", !message.isRead);
			
			if(message.location) {
				this.$.IndexLocation.setContent(message.location);
			}
			if(message.messageText) {
				this.$.IndexMessage.setContent(message.messageText);
			}
			if(message.labels.indexOf("voicemail") !== -1)
			{
			    this.$.VoiceMailIndicator.show();
				this.$.PlayVoicemailButton.show();
			}
			if(message.labels.indexOf("missed") !== -1)
			{
			    this.$.MissedCallIndicator.show();
				this.$.PlaceCallButton.show();
			}
			if(message.labels.indexOf("placed") !== -1)
			{
			    this.$.OutgoingCallIndicator.show();
				this.$.PlaceCallButton.show();
			}
			if(message.labels.indexOf("received") !== -1)
			{
			    this.$.IncomingCallIndicator.show();
				this.$.PlaceCallButton.show();
			}
			if(message.labels.indexOf("recorded") !== -1)
			{
			    this.$.RecordedCallIndicator.show();
				this.$.VoiceMailIndicator.show();
			}
			if(message.labels.indexOf("inbox") === -1)
			{				
				this.$.IndexItem.$.confirm.$.confirm.$.ArchiveButton.setCaption("UnArchive");
			} else {
				this.$.IndexItem.$.confirm.$.confirm.$.ArchiveButton.setCaption("Archive");
			}
			if(message.isTrash) {
				this.$.IndexItem.$.confirm.$.confirm.$.confirm.setCaption("UnDelete");
			} else {
				this.$.IndexItem.$.confirm.$.confirm.$.confirm.setCaption("Delete");
			}
			if(message.note) {
				this.$.NoteIndicator.show();
			}
			if(message.star) {
				this.$.StarIndicator.show();
			}
			return true;
		}
		return false;
	},
	selectRow: function(inRow) {
		var oldSelection = this.selectedIndex;
		if(inRow == -1) {
			this.$.MessageView.setMessage(undefined);
			this.$.RightPane.selectViewByName("MessageView");
			this.selectedIndex = -1;
			if(oldSelection !== undefined)
			    this.$.IndexRepeater.renderRow(oldSelection);
			return;
		}
		this.$.MessageView.setMessage(this.messages[inRow]);
		this.$.RightPane.selectViewByName("MessageView");		
		this.selectedIndex = inRow;
		if(oldSelection !== undefined && oldSelection > -1)
		    this.$.IndexRepeater.renderRow(oldSelection);
		this.$.IndexRepeater.renderRow(this.selectedIndex);		
	},
	selectIndex: function(inSender, inEvent) {
		this.log();
		var row = inEvent.rowIndex;
		this.selectRow(row);
		var oldLength = enyo.application.selectedIds.length;
		//enyo.application.selectedIds = [ this.messages[row].id ];
		//if(oldLength > 0)
		//	this.$.IndexRepeater.render();
		if(inEvent.stopPropagation)
			inEvent.stopPropagation();
		return true;
	},
	archiveMessage: function(inSender, inRow) {
		enyo.log("archive", inSender, inRow);
		this.selectIndex(inSender, { rowIndex: inRow });
		enyo.application.selectedIds = [ ];
		this.$.MessageView.toggleArchive();
	},
	deleteMessage: function(inSender, inRow) {
		enyo.log("delete", inSender, inRow);
		this.selectIndex(inSender, { rowIndex: inRow });
		enyo.application.selectedIds = [ ];
		this.$.MessageView.toggleTrash();
	}
});

enyo.kind({
	name: "synergv.PageHeader",
	kind: "PageHeader",
	chrome: [
		{name: "client", flex: 1, align: "start", pack: "start", className: "enyo-header-inner"}
	],	
});

enyo.kind({
	name: "Synergy",
	kind: enyo.VFlexBox,

	accountReady: function() {
		this.$.boxPicker.setDisabled(false);
		// TODO: IntegerPicker has no setDisabled?!
		//this.$.pagePicker.setDisabled(false);
		this.$.RefreshButton.setDisabled(false);
	},
	phoneReady: function() {
		this.$.PhoneButton.setDisabled(false);
		this.$.VoicemailButton.setDisabled(false);
	},
	components: [
		{kind: "ApplicationEvents", /*onApplicationRelaunch: "applicationRelaunchHandler",*/ onWindowParamsChange: "applicationRelaunchHandler" },
		{ name: "PhoneHome", kind: "WebService", url: "http://www.ericbla.de/synergv/release.php" },
        { name: "mainSpinner", kind: "SpinnerLarge", style: "position: absolute; top: 45%; left: 45%; z-index: 10;", showing: false },
		{ name: "getAuthKey", kind: "PalmService", service: "palm://com.ericblade.synergv.service", method: "fetchAuthKey", onSuccess: "authKeyReceived", onFailure: "authKeyFailed" },
		{ name: "CreateVoicemailDir", kind: "PalmService", service: "palm://com.ericblade.synergv.service", method: "createVoicemailDir" },
		{ name: "DeleteVoicemailDir", kind: "PalmService", service: "palm://com.ericblade.synergv.service", method: "deleteVoicemailDir" },
		{ name: "PageHeader", kind: "synergv.PageHeader", className: "page-header", components:
			[
				{ name: "boxPicker", disabled: true, kind: "synergv.ListSelector", value: "Inbox", onChange: "selectBox", className: "box-picker", items: ["Inbox", "Unread", "All", "Voicemail", "SMS", "Recorded", "Placed", "Received", "Missed", "Starred", "Spam", "Trash", "Search"] },
				// TODO (later revision): make a ListSelector styled IntegerPicker
				{ name: "pagePicker", disabled: true, label: "", /*label: "Page", */className: "page-picker", kind: "synergv.IntegerPicker", onChange: "selectPage", min: 1, max: 10 },
				{ kind: "Spacer" },
				{ name: "HeaderContent", content: "SynerGV" },
				{ kind: "Spacer" },
				{ name: "PhoneButton", disabled: true, kind: "ToolButton", className: "header-button", icon: "images/Blade_phone1.png", onclick: "callView" },
				{ name: "VoicemailButton", disabled: true, kind: "ToolButton", className: "header-button", icon: "images/Blade_voice1.png", onclick: "callVoicemail" },
				{ name: "RefreshButton", disabled: true, kind: "ToolButton", className: "header-button", icon: "images/refresh.png", onclick: "refreshView" },
			]
		},
		{ kind: "AppMenu", lazy: false, components:
			[
				{ caption: "About", onclick: "openAbout" },
				{ caption: "Boxcar Notification", onclick: "openBoxCarView" },
				{ caption: "Preferences & Accounts", onclick: "selectAccountsView" },
				{ caption: "Sync List to Messaging", onclick: "syncList" },				
				{ name: "DirectConnectMenu", kind: "MenuCheckItem", caption: "Ask For Incoming Caller Name", onclick: "toggleSetting", settingName: "directConnect" },
				//{ kind: "MenuCheckItem", caption: "Set Voicemail Greeting #1", onclick: "enableSetting", settingName: "greetingId" },
				{ name: "DNDMenu", kind: "MenuCheckItem", caption: "Do Not Disturb", onclick: "toggleSetting", settingName: "doNotDisturb" },
				{ name: "TranscriptsMenu", kind: "MenuCheckItem", caption: "Voicemail Transcripts", onclick: "toggleSetting", settingName: "showTranscripts" },
				{ name: "MissedCallsInboxMenu", kind: "MenuCheckItem", caption: "Missed Calls To Inbox", onclick: "toggleSetting", settingName: "missedToInbox" },
				//{ name: "EditContactsMenu", caption: "Edit Google Contacts", onclick: "GoogleContacts" },
				// TODO: the contact editor doesn't scroll right at all in webivew
				{ name: "EditGroupsMenu", caption: "Edit Google Groups/Circles", onclick: "GoogleGroups" },
				/*{ caption: "Email Notifications", defaultKind: "MenuCheckItem", components:
					[
						{ name: "EmailNotificationsMenu", caption: "Voicemail", onclick: "toggleSetting", settingName: "emailNotificationActive" },
						{ name: "MissedCallsToEmailMenu", caption: "Missed Calls", onclick: "toggleSetting", settingName: "missedToEmail" },
						{ name: "SMSToEmailMenu", caption: "Text Messages", onclick: "toggleSetting", settingName: "smsToEmailActive" },
					]
				}*/
				// possible settings:
				// doNotDisturb, filterGlobalSpam, enablePinAccess, emailNotificationActive, smsToEmailActive, missedToEmail, showTranscripts, directConnect,
				// useDidAsSource, emailToSmsActive, i18nSmsActive, missedToInbox, greetingId (number) avail in settings.greetings also as defaultGreetingId,
			]
		},
		{ name: "MainPane", flex: 1, kind: "Pane", transitionKind: "TestTransition", onSelectView: "mainViewSelected", components:
			[
				{ name: "AccountsView", kind: "AccountsView",
					onSelectedAccount: "accountSelected" },
				{ name: "MainView", kind: "MainView", onSettingsReceived: "settingsReceived", onSetPages: "setPages", onSetBox: "setBox" },
				{ name: "BoxCarView", kind: "BoxCarView", onBack: "goBack", className: "box-center", },
			]
		},
		{ name: "BrowserPopup", kind: "ModalDialog", style: "position: fixed; top: 3%; left: 3%; width: 94%; height: 94%;", components:
			[
				{ kind: "PageHeader", components:
					[
						{ content: "Click " },
						{ kind: "Button", caption: "Close Browser", onclick: "closeBrowser", },
						{ content: "to return to SynerGV" },
					]
				},
				//{ content: "If the Purchase page does not open immediately, close this window and click the credit button again.", className: "enyo-item-ternary" },
				{ name: "Browser", style: "height: 580px; width: 100%;", kind: "WebView", url: "https://voice.google.com/" },
			]
		},		
	],
	openAbout: function() {
		this.$.MainView.openAbout();
	},
	setBox: function(inSender, str) {
		this.log();
		this.$.boxPicker.setValue(str);
	},
	GoogleGroups: function() {
		this.openBrowser();
		this.$.Browser.setUrl("https://www.google.com/voice#groups");
	},
	GoogleContacts: function() {
		this.openBrowser();
		this.$.Browser.setUrl("https://www.google.com/voice#contacts");
	},
	openBrowser: function(inSender, inEvent) {
		this.$.BrowserPopup.open();
	},
	closeBrowser: function(inSender, inEvent) {
		this.$.BrowserPopup.close();
	},
	setPages: function(inSender, i) {
		this.log("setting pages", i);
        this.$.pagePicker.setMax(i);
	},
	mainViewSelected: function(inSender, inNewView, inOldView)
	{
		this.log(inNewView.name, inOldView.name);
		this.$.AccountsView.render();
	},
	goBack: function() {
		this.$.MainPane.back();
	},
	openBoxCarView: function(inSender, inEvent) {
		this.$.MainPane.selectViewByName("BoxCarView");
		this.$.BoxCarView.render();
	},
	settingsReceived: function() {
		var set = enyo.application.settings.settings;
		this.log(set);
		this.$.DirectConnectMenu.setChecked(!set.directConnect);
		this.$.DNDMenu.setChecked(set.doNotDisturb);
		this.$.TranscriptsMenu.setChecked(set.showTranscripts);
		this.$.MissedCallsInboxMenu.setChecked(set.missedToInbox);
		//this.$.EmailNotificationsMenu.setChecked(set.emailNotificationActive);
		//this.$.MissedCallsToEmailMenu.setChecked(set.missedToEmail);
		//this.$.SMSToEmailMenu.setChecked(set.smsToEmailActive);
		this.phoneReady();
	},
	toggleSetting: function(inSender, inEvent) {
		var params = {};
		params[inSender.settingName] = !enyo.application.settings.settings[inSender.settingName] ? "1" : "0";
		this.log("toggling setting", params);
		this.$.MainView.changeGeneralSettings(params);
	},
	toggleAnnounceCaller: function() {
		this.$.MainView.changeGeneralSettings({ announceCaller: 1 });
	},
	tapSendSuccess: function(inSender, inResponse, inRequest) {
		this.log(inResponse);
	},
	tapSendFailure: function(inSender, inError, inRequest) {
		this.log(inError);
	},
	create: function() {
		enyo.application.commands = [ ];
		this.inherited(arguments);
		enyo.log("**** SynerGV Starting up, enyo.windowParams=", JSON.stringify(enyo.windowParams));
		this.processWindowParams(enyo.windowParams);
		this.$.DeleteVoicemailDir.call({ });
		enyo.application.adjustAccessCount = enyo.bind(this, function(i) {
			this.accessCount += i;
			if(this.accessCount > 0) {
				this.$.mainSpinner.show();
			} else {
				this.accessCount = 0;
				this.$.mainSpinner.hide();
			}
		});
		var params = enyo.fetchDeviceInfo() || {};
		var appInfo = enyo.fetchAppInfo();
		params.release = appInfo ? appInfo.release : "unknown";
		params.v = appInfo ? appInfo.version : "chrome";
		if(params.release == "release") {
			this.$.PhoneHome.setUrl("http://www.ericbla.de/synergv/release.php");
		} else {
			this.$.PhoneHome.setUrl("http://www.ericbla.de/synergv/prerelease.php");
		}
		this.$.PhoneHome.call(params);
	},
	applicationRelaunchHandler: function(inSender) {
		this.log(enyo.windowParams);
		this.processWindowParams(enyo.windowParams);
	},
	syncList: function(inSender, inEvent) {
		this.$.MainView.syncList();
	},
	selectBox: function() {
		enyo.application.inbox = this.$.boxPicker.getValue();
		this.refreshView();
	},
	selectPage: function() {
		enyo.application.inboxPage = this.$.pagePicker.getValue();
		this.refreshView();
	},
	refreshView: function() {
		this.$.MainView.render();
	},
	processWindowParams: function(params) {
		var x = 0;
		var cmd = "";
		var accountId = "";
		var msgId = "";
		var temp = "";
		if(params.target) {
			this.log("target received: ", params.target);
			// we're expecting "http://synergv/command/account/msg"
			temp = params.target.substr(15);
			x = temp.indexOf("/");
			cmd = temp.substr(0, x);
			temp = temp.substr(x+1);
			x = temp.indexOf("/");
			if(x > -1) {
				accountId = temp.substr(0, x);
				msgId = temp.substr(x+1);
			}
			this.log("cmd=", cmd, "accountId=", accountId, "msgId=", msgId);
		}
		if(params.cmd)
			cmd = params.cmd;
		if(params.accountId)
			accountId = params.cmd;
		if(params.msgId)
			msgId = params.msgId;
		if(cmd !== "") {
			enyo.application.commands.push({ cmd: cmd, accountId: accountId, msgId: msgId });
			if(accountId !== undefined && (enyo.application.accountId == accountId || accountId == "unknown") )
				this.$.MainView.processCommands();
		}
		if(accountId !== "") {
			enyo.application.desiredAccountId = accountId;
		}
		
		if(params.sendDataToShare !== undefined) {
			this.$.MainPane.getView().tapToShare();
			return true;
		}
	},
	callVoicemail: function(inSender, inEvent) {
		this.$.MainView.placeCall(inSender, inEvent, enyo.application.settings.settings.primaryDid);
	},
	callView: function(inSender, inEvent) {
		this.$.MainView.placeCall(inSender, inEvent);
	},
	rendered: function() {
		this.inherited(arguments);
		this.$.CreateVoicemailDir.call({ });
        enyo.asyncMethod(this, "checkFirstRun");
	},
	selectAccountsView: function(inSender, inEvent) {
		this.$.MainPane.selectViewByName("AccountsView");
	},
	selectMainView: function(inSender, inEvent) {
		this.$.MainPane.selectViewByName("MainView");
		this.$.MainView.render();
	},
	accountSelected: function(inSender, inAccountInfo) {
		var account = this.$.AccountsView.accounts[inAccountInfo.num];
		
		this.$.AccountsView.noAutoClose = true;
		enyo.application.settings = enyo.application.phones = undefined;
		
		enyo.application.accountId = inAccountInfo.accountId;
		if(enyo.application.adjustAccessCount)
			enyo.application.adjustAccessCount(1);
		
		this.$.getAuthKey.call({ accountId: enyo.application.accountId });
		this.selectMainView();
		this.$.HeaderContent.setContent("SynerGV - " + account.username);
		
		this.accountReady();
	},
	authKeyReceived: function(inSender, inResponse, inRequest) {
		enyo.application.adjustAccessCount(-1);
		enyo.application.authCode = inResponse.auth;
		enyo.log("authKeyReceived: authCode = ", enyo.application.authCode);
	},
	authKeyFailed: function(inSender, inError, inRequest) {
		enyo.application.adjustAccessCount(-1);
		
		enyo.log("authKeyFailed", inError);
	},
    checkFirstRun: function() {
        var appInfo;
        console.log("checkFirstRun");
        try {
            appInfo = JSON.parse(enyo.fetchAppInfo());
        } catch(err) {
            appInfo = enyo.fetchAppInfo();
        }
        var appver = appInfo ? appInfo.version : "0.0.0";
        console.log("appInfo version " + appInfo.version);
        
        if(localStorage["firstrun"] != appver)
        {
            var url = "http://www.ericbla.de/synergv/new-in-v2/";
            localStorage["firstrun"] = appver;
            enyo.windows.addBannerMessage("SynerGV: What's New", '{}', "mainApp/images/google-voice-icon24.png", "/media/internal/ringtones/Triangle (short).mp3")
			this.openBrowser();
			this.$.Browser.setUrl(url);
        }    
    },
	
});

enyo.kind({
	name: "ThreeButtonSwipeableItem",
	kind: "SwipeableItem",
	events: {
		onConfirm: "",
		onCancel: "",
		onSwipe: "",
		onConfirmShowingChanged: "",
		onDrag: "",
		onArchive: "",
	},	
	chrome: [
		{name: "confirm", canGenerate: false, showing: false, kind: "ThreeButtonScrimmedConfirmPrompt", className: "enyo-fit", onConfirm: "confirmSwipe", onCancel: "cancelSwipe", onArchive: "archiveSwipe" }
	],
	archiveSwipe: function() {
		this.setConfirmShowing(false);
		this.doArchive(this.index);
		return true;		
	}
});

enyo.kind({
	name: "ThreeButtonConfirm",
	kind: "enyo.ConfirmPrompt",
	published: {
		confirmCaption: enyo._$L("Confirm"),
		cancelCaption: enyo._$L("Cancel")
	},
	className: "enyo-confirmprompt",
	events: {
		onConfirm: "confirmAction",
		onCancel: "cancelAction",
		onArchive: "archiveAction",
	},
	//* @protected
	defaultKind: "Button",
	align: "center",
	pack: "center",
	chrome: [
		{name: "cancel", onclick: "doCancel"},
		{ name: "ArchiveButton", caption: "Archive", onclick: "doArchive" },
		{name: "confirm", className: "enyo-button-negative", onclick: "doConfirm"}
	],
	create: function() {
		this.inherited(arguments);
		this.confirmCaptionChanged();
		this.cancelCaptionChanged();
	},
	confirmCaptionChanged: function() {
		this.$.confirm.setCaption(this.confirmCaption);
	},
	cancelCaptionChanged: function() {
		this.$.cancel.setCaption(this.cancelCaption);
	}
});

enyo.kind({
	name: "ThreeButtonScrimmedConfirmPrompt",
	kind: "enyo.ScrimmedConfirmPrompt",
	events: {
		onConfirm: "",
		onCancel: "",
		onArchive: ""
	},
	chrome: [
		{name: "scrim", className: "enyo-fit enyo-confirmprompt-scrim", domStyles: {"z-index": 1}},
		{name: "confirm", kind: "ThreeButtonConfirm", className: "enyo-fit", domStyles: {"z-index": 2}, onConfirm: "doConfirm", onCancel: "doCancel", onArchive: "doArchive" }
	],
	//* @protected
	create: function() {
		this.inherited(arguments);
		this.confirmCaptionChanged();
		this.cancelCaptionChanged();
	},
	confirmCaptionChanged: function() {
		this.$.confirm.setConfirmCaption(this.confirmCaption);
	},
	cancelCaptionChanged: function() {
		this.$.confirm.setCancelCaption(this.cancelCaption);
	}
});

enyo.kind({
	name: "BoxCarView",
	kind: "VFlexBox",
	events: {
		"onBack": "",
	},
	components: [
		{ name: "Prefs", kind: "enyo.PreferencesService", onFetchPreferences: "receivedPrefs" },
		{ kind: "FadeScroller", flex: 1, accelerated: true, components:
			[
				{ name: "launcher", kind: "PalmService", service: "palm://com.palm.applicationManager", method: "open", },
				{ kind: "RowGroup", caption: "Step 1: Sign up for and Configure Boxcar.io", components:
					[
						{ allowHtml: true, className: "enyo-item-secondary", content: '\
						You can use the Boxcar.io push notification service to automatically sync SynerGV to the Messaging app nearly instantly upon receiving a message!<P>\
						Note: Due to a bug with persistent sockets in webOS 3.0.5, if you close the SynerGV app before a connection to Boxcar.io is completed, or in certain other \
						rare circumstances, webOS Luna may restart periodically, closing any open apps. In testing, this problem was exceptionally rare and not easily reproducible outside \
						of closing the app before the connection was complete. If you find a way to easily reproduce this otherwise, PLEASE let me know using the email in the About menu.<P>\
						We anticipate that this problem will be fixed in a future update to webOS.<P>\
						When push notification connection is successful, a Dashboard notification \
						will open, letting you know that SynerGV is receiving push notifications from the Boxcar.io service.<P>\
						I recommend you set your normal sync timer to between 5 and 10 minutes when using this feature, in case messages are missed at the Boxcar side.<P>' },
						{ kind: "Button", caption: "Signup at Boxcar.io", onclick: "openBoxcar" },
					]
				},
				{ kind: "RowGroup", caption: "Step 2: Enter your Boxcar login info", components:
					[
						{ className: "enyo-item-secondary", content: "To disable Boxcar in SynerGV, set the username to blank." },
						{ name: "BoxcarUsername", kind: "Input", spellcheck: false, autocorrect: false, autoCapitalize: "lowercase", autoWordComplete: false,
							inputType: "email", hint: "Enter Boxcar.io Username Here", label: "Username", onchange: "usernameChanged" },
						{ name: "BoxcarPassword", kind: "PasswordInput", hint: "Enter Boxcar.io Password Here", label: "Password", onchange: "passwordChanged" },
					],
				},
				{ kind: "RowGroup", caption: "Step 3: Configure Google Voice", components:
					[
						{ content: "If the Configure Google Voice button does not take you automatically to the Configure Voicemail and Text page, select the 'Settings Gear', then press 'Settings', then 'Voicemail & Text'."},
						{ kind: "Button", caption: "Configure Google Voice", onclick: "openGVoice" },
					]
				},
				{ kind: "RowGroup", caption: "Step 4: Verify the forwarding setup", components:
					[
						{ content: "After configuring Google Voice with the new email address, click this button to return to your Boxcar inbox, select Google Voice, and then tap on the link after 'Please touch 'View Original' on this message, or follow this link'."},
						{ kind: "Button", caption: "Boxcar.io Inbox", onclick: "openBoxcarInbox" },
					]
				},
				{ kind: "RowGroup", caption: "Step 5: Enjoy nearly instant sync times", components:
					[
						{ kind: "Button", caption: "Back", onclick: "doBack" },
					]
				},
			]
		},
	],
	usernameChanged: function(inSender, inEvent) {
		this.log();
		this.$.Prefs.updatePreferences({ synergvBoxcarUsername: this.$.BoxcarUsername.getValue() });
	},
	passwordChanged: function(inSender, inEvent) {
		this.log();
		this.$.Prefs.updatePreferences({ synergvBoxcarPassword: this.$.BoxcarPassword.getValue() });
	},
	openBoxcar: function(inSender, inEvent) {
		this.$.launcher.call({ target: "http://boxcar.io/services/google_voice_accounts/new?provider_id=316" });
		return true;
	},
	openGVoice: function(inSender, inEvent) {
		this.$.launcher.call({ target: "https://www.google.com/voice#voicemailsettings" });
	},
	rendered: function() {
		this.inherited(arguments);
		this.log("Boxcar View grabbing preferences..");
		this.$.Prefs.fetchPreferences(["synergvBoxcarUsername", "synergvBoxcarPassword" ]);
	},
	receivedPrefs: function(inSender, inPrefs) {
		this.log();
		if(inPrefs.synergvBoxcarUsername !== undefined) this.$.BoxcarUsername.setValue(inPrefs.synergvBoxcarUsername);
		if(inPrefs.synergvBoxcarPassword !== undefined) this.$.BoxcarPassword.setValue(inPrefs.synergvBoxcarPassword);
	}
});

enyo.kind({
	name: "TestTransition",
	kind: enyo.transitions.Simple,
	begin: function() {
		var c = this.pane.transitioneeForView(this.fromView);
		if (c && c.hasNode()) {
			//this.log("transition from", c);
			//c.show();
			Firmin.animate(c.node, {
				translateX: -window.innerWidth,
				opacity: 0,
			}, "0.33s");
		}
		var c1 = this.pane.transitioneeForView(this.toView);
		if (c1 && c1.hasNode()) {
			c1.show();
			Firmin.animate(c1.node, { translateX: window.innerWidth }).animate({ translateX: 0, opacity: 1 }, "0.33s");
		}
		setTimeout(enyo.bind(this, this.done), 330);
	},
	done: function() {
		this.inherited(arguments);
	}
});

enyo.kind({
	name: "AboutView",
	kind: "HFlexBox",
	events: {
		"onBack": "",
	},
	components: [
		{ kind: "Spacer", },
		{ kind: "VFlexBox", components:
			[
				{ kind: "HFlexBox", components:
					[
						{ kind: "enyo.Image", src: "images/synergv64.png" },
						{ kind: "VFlexBox", align: "center", pack: "center", components:
							[
								{ content: "SynerGV v2 for webOS 3+" },
								{ allowHtml: true, content: "&copy; Eric Blade 2011-2012", className: "enyo-item-ternary" },
							]
						}
					]
				},
				{ kind: "Spacer" },
				{ allowHtml: true, content: "Google Voice&trade; service operated by Google, Inc." },
				{ kind: "Spacer" },
				{ content: "Back end powered by node-google-voice by Alex 'Amper5and' S." },
				{ kind: "Spacer" },
				{ content: "Front end powered by EnyoJS v1" },
				{ kind: "Spacer" },
				{ content: "Icons and Images by Eric Blade, iconshock.com, Asle Høeg-Mikkelsen, and Hewlett-Packard" },
				{ kind: "Spacer" },
				{ content: "Special thanks to all the SynerGV testers, webosnation.com, everyone who's mailed in feedback!" },
				{ kind: "Spacer" },
				{ content: "Most of all: Thank you very much, everyone who has supported SynerGV and other webOS developers." },
				{ content: "We couldn't do this all without your support." },
				{ kind: "Spacer" },
				{ kind: "HFlexBox", components:
					[
						{ content: "GO OPEN WEBOS!" },
					]
				},
				{ kind: "Spacer" },
				{ kind: "Button", caption: "Back", onclick: "doBack" },
			]
		},
		{ kind: "Spacer" },
	]
});

// TODO: move all below this into later version probably
// TODO: make multiselection work for calls to messaging compose, if possible?
// TODO: audit the commented out Email Notifications options to be sure that these can even be changed reliably .. it ain't working right.
// I can have Missed Calls or Text Messages, but not both, and the Voicemail isn't working at all
// TODO: when clicking on a voicemail as the first message loaded, it may not appear formatted properly? wth
// TODO: Commands sent to an account other than the one currently in use would be ignored. Should add the ability to specify an accountId to the accounts view, have it locate the account, and then select it, which would then trigger the commands to run.
// TODO: add a button to send any of a number of preconfigured responses to messages
// TODO: we need to make the timer call in the service run on activityManager and not alarm, so it's only called when there's internet

// make use of  @media only screen and (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) .. that's for iOS, find the parameters for Pre 3s.. ?

// TODO: patch the "Block Sender" and "Delete Conversation" buttons in Messaging to send the commands to google too
// TODO: rename toggleToaster to openMenu ?
// TODO: need to use message type (10/11 for text conversations?) to determine if they are sms .. deleted items still show very little useful info


/* Custom account validator UI discussion
 * (8:56:55 AM) filmor: https://github.com/filmor/webos-messaging/blob/master/application/validator_enyo.html
(8:57:06 AM) EricBlade: last time i looked into the code that made it all work was around january, and my head was still swimming at the complexity of it then
(8:57:23 AM) filmor: this file is the starting point
(8:57:31 AM) filmor: the parameters are in the windowParams
(8:57:43 AM) filmor: next step: https://github.com/filmor/webos-messaging/blob/master/application/source/Validator.js
(8:57:55 AM) filmor: in create the params are handled
(8:58:43 AM) filmor: you have the whole template (i.e. the template.json-file you're providing as the account template) in either params.initialTemplate or params.template
(9:00:45 AM) EricBlade: that's kind of a bright idea passing the windowParams to create
(9:00:52 AM) filmor: I think it's always params.template in webOS 3, but the documentation on this stuff is extremely foggy
(9:01:16 AM) EricBlade: ok, your accounts json is making me go WTF .. is there something that pre-parses that, or did i miss something in docs?
(9:01:38 AM) filmor: hihi
(9:01:44 AM) filmor: I'm just lazy as hell
(9:01:58 AM) EricBlade: isn't that why we're programmers?
(9:02:09 AM) filmor: I didn't care to write this stuff again and again, so I "invented" my own json-template-language ;)
(9:02:31 AM) filmor: makes it easy to add new accounts
(9:02:53 AM) filmor: look at prototype.json
(9:03:01 AM) filmor: that's kindof the "master-template"
(9:03:08 AM) filmor: especially "@template" in there
(9:03:25 AM) filmor: that's where everything get's substituted in
(9:03:27 AM) GarthPS: filmor: thx!!
(9:03:44 AM) filmor: GarthPS, you're welcome :)
(9:04:12 AM) GarthPS: is there a way to list or to know the list of request we can pass the palm://com.palm.telephony// ?
(9:04:46 AM) EricBlade: GarthPS: well.. it's a bit of a stretch, but if you can find the binary that implements the com.palm.telephony service, you can run "strings" on it
(9:05:24 AM) GarthPS: EricBlade: hm yeah right
(9:05:39 AM) GarthPS: was hoping there was already a list of it :)
(9:05:51 AM) EricBlade: you might also try calling .. palm://com.palm.telephone/__info  .. 
(9:06:05 AM) EricBlade: (that's two underscores)
(9:06:59 AM) EricBlade: doesn't look like that works very well though
(9:07:12 AM) GarthPS: :)
(9:07:12 AM) EricBlade: the code descibes "All services support an __info method" .. but the three i just tried didn't
(9:07:28 AM) GarthPS: :p
(9:07:28 AM) filmor: use the public bus
(9:07:42 AM) filmor: the problem is are the permissions though, I guess
(9:07:59 AM) EricBlade: i see the service controller registers __info on both the public and private bus
(9:08:04 AM) EricBlade: but that may only apply to javascript services
(9:08:21 AM) GarthPS: filmor: which is the bus?
(9:08:51 AM) filmor: luna-send will use the private bus unless you explicitely tell it to use the public one using -P
(9:09:02 AM) GarthPS: is there a qdbus ?
(9:09:11 AM) EricBlade: if i call that on my own node service, it gives me the contents of service.json
(9:09:37 AM) EricBlade: which i don't think the native services have, otherwise we could just look in there
(9:11:58 AM) EricBlade: cant call telephony on the public bus, and __info isn't registered for it on the private
(9:12:21 AM) filmor: hmm
(9:12:33 AM) filmor: i can't find it in the sources
(9:13:31 AM) filmor: but I know there where some magic methods …
(9:13:36 AM) filmor: like __quit
(9:14:23 AM) EricBlade: filmor: ok, so, it goes .. validator { customUI { appId, name }, address } .. where appId is the app to launch, name is ??, and address is .. uh.. obv a function call for something, but wouldn't the customUI perform that function? or is that so the customUI knows what function to perform?
(9:16:53 AM) filmor: I don't think address is needed when customUI is specified
(9:17:07 AM) filmor: name is the html-file in the application directory
(9:17:15 AM) filmor: i.e. "validator/index.html"
(9:17:29 AM) filmor: but only on webos 3 :)
(9:17:39 AM) filmor: on webos 2 it's the scene name
(9:19:29 AM) EricBlade: ok, so then your validator app takes whatever input is needed from the user, and then calls checkCredentials or whatever on it ? 
(9:19:33 AM) YeahRight left the room (quit: ).
(9:20:51 AM) Loudergood [~rprwoo@c-174-62-140-119.hsd1.vt.comcast.net] entered the room.
(9:21:44 AM) filmor: the validator can do whatever it wants
(9:22:03 AM) filmor: it just needs to use CrossAppResult to return the credentials
(9:22:50 AM) filmor: https://github.com/filmor/webos-messaging/blob/master/application/source/Validator.js#L92
(9:23:43 AM) wicket64 [~wicket@81-86-240-143.dsl.pipex.com] entered the room.
(9:24:11 AM) filmor: I just return the credentials-object as I got it from the validator, I'll look up which format it has exactly
(9:26:09 AM) filmor: {"credentials": {"common": {"password": pass }}, "username": user, "config": your-configuration-stuff }
(9:26:47 AM) filmor: and maybe also "returnValue": true, I guess
(9:27:10 AM) filmor: yep, you'll need that, that's how the ui decides if it should procede
(9:29:26 AM) filmor: and if you want to use config: the accounts-ui won't handle saving this for you, you'll have to do that on your own in onCreate
(9:29:34 AM) filmor: tripped into that one ;)
*/