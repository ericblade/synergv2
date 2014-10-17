enyo.kind({
    name: "NotePopup",
    kind: "Popup",
    events: {
        onNoteSaved: ""
    },
    published: {
        messageIndex: "",
        messageId: "",
        note: ""
    },
    components: [
        { name: "NoteText", kind: "RichText", value: "Note", className: "noteInput", onchange: "contentChanged" },
    ],
    noteChanged: function() {
        this.$.NoteText.setValue(this.note);
    },
    contentChanged: function() {
        //enyo.log("Note edited, new content: ", this.$.NoteText.getValue());
        //this.doNoteSaved(this.messageIndex, this.$.NoteText.getValue());
        this.doNoteSaved(this.$.NoteText.getValue());
    }
});