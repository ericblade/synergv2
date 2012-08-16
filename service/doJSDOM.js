var voicemailMp3BaseUrl = 'https://www.google.com/voice/media/send_voicemail/';

var fs = require('fs');
var servicePath = fs.realpathSync('.');
var modulePath = servicePath + '/node_modules';
var jsdom = require(modulePath+'/jsdom/lib/jsdom.js');

console.log("doJSDOM: reading files");
var html = fs.readFileSync('/tmp/synergvtemp/jsdominput'+process.argv[2]+'.txt');
var messages = JSON.parse(fs.readFileSync('/tmp/synergvtemp/jsdommessages'+process.argv[2]+'.txt'));
var document = jsdom.jsdom(html,jsdom.level(2, 'html'));
console.log("DOM created");

var msgArray = [];

for(var msgId in messages){
    console.log("doJSDOM: Processing message " + msgId);
    var msg = messages[msgId];
    var msgHtml = document.getElementById(msgId);
    msg.location = msgHtml.getElementsByClassName('gc-message-location');
    if(msg.location[0]) {
        var loc = msg.location[0].getElementsByClassName('gc-under')[0];
        msg.location = (loc && loc.innerHTML) || "";
    } else {
        msg.location = "";
    }
    var thread = msgHtml.getElementsByClassName('gc-message-sms-row');
    if(thread.length > 0){
        msg.thread = [];
        var thread = document.getElementById(msgId).getElementsByClassName('gc-message-sms-row');
        thread.forEach = Array.prototype.forEach;
        thread.forEach(function(text){
            msg.thread.push({
                time: getField('time', text),
                from: getField('from', text),
                text: getField('text', text)
            });
        });
    }
    if(isMessage(msg,'voicemail') || isMessage(msg,'recorded')){
        msg.url = voicemailMp3BaseUrl + msgId;
    }
    msgArray.push(msg);
}

fs.writeFileSync('/tmp/synergvtemp/jsdomoutput'+process.argv[2]+'.txt', JSON.stringify(msgArray));
function isMessage(msg,type){
        return !!~msg.labels.indexOf(type);
};

function getField(field,message){
    var SMSfields = {
            time: 'gc-message-sms-time',
            from: 'gc-message-sms-from',
            text: 'gc-message-sms-text'
    };
        var msg = message || this;
        var f=msg.getElementsByClassName(SMSfields[field])[0].innerHTML || '' ;
        return f.trim();
};

//fs.writeFileSync('./jsdomoutput.txt', JSON.stringify(document));
