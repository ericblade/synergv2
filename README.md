SynerGV 2

SynerGV 2 is a re-write and somewhat functionally changed SynerGV 1
(in my synergv1 repo) Google Voice(tm) app for webOS.

It is implemented partially as a significantly modified version of Alexander Stetsyuk's
outstanding node-google-voice implementation at https://github.com/amper5and/node-google-voice .

The node-google-voice module in this package has gone through extensive changes that
were required to make it operate in the node 0.2 and 0.4 versions available within
webOS.  **note: it does work in the 0.4 version in webOS 3.0.5, it may require additional
work to get it working in webOS 3.0.4 or earlier, which used node 0.2.

There are also several other node.js libraries that are included in this package, most of
which have undergone anywhere from minor to significant modifications to work with the
older version of node, or to hammer them into operating in a specific fashion.

Originally written in 2011-2012 for webOS 3.0.x, SynerGV is one of the most popular Google
Voice(tm) management apps out there, and is the only app ever released on the HP/Palm
App Catalog that implemented Synergy Instant Messaging support.  (Thanks to lack of documentation...)

SynerGV was originally built as an app to allow SMS text messaging from a tablet,
and has been enhanced to support nearly every function of Google Voice.

Plans had been made to create a SynerGV 3, which would have been written in
a combination of standard Javascript using Enyo v2,
as well as platform specific pieces in other languages, such as node.js Javascript,
Android Java, QML, and others, but lack of time on the author's part has made that
an excruciatingly slow project that may not ever see the light of day.

You are welcome to use this code in any fashion that you see fit, just remember
to give credit where credit is due, and follow the LICENSE agreement. Also follow
any license agreements for any modules that are used.

** PLEASE keep in mind that Open Source projects work best for everyone when you
actively contribute!  Pull Requests and Gerrithub Code Review requests are welcome!

Original SynerGV 2 code through the initial commit to this repository is Copyright 2011 - 2014, Eric Blade. All additional code that is not mentioned below, is copyright the author of that code. All contributions to this code are considered to be released under the terms of the LICENSE file here.

The node library "gvhttps" is Copyright 2012-2014, Eric Blade, and falls under the SynerGV license.

The SynerGV icon is Copyright iconshock.com.

The search icon is Copyright Oxygen Team.

Additional graphics and Icons are copyright Asle Hoeg-Mikkelsen.

node-google-voice is copyright Alexander Stetsyuk.

node-googleclientlogin by Segment ( https://github.com/segmentio )

node jsdom is Copyright (c) 2010 Elijah Insua

node request is by Mikeal Rogers ( https://github.com/mikeal )

node websocket-client is Copyright (c) 2010, Peter Griess <pg@std.in>

node xml2js is by Marek Kubica ( https://github.com/Leonidas-from-XIV )

**
This repo is available at gerrithub!  Visit gerrithub.io, and search for the
project "ericblade/synergv2", or simply search "ericblade" for all of my public
source code.

More information about gerrithub is available here:
https://www.youtube.com/watch?v=jeWTvDad6VM

=== To run in Chrome ===

(Windows) Create a new shortcut on your desktop to Chrome.  Edit that shortcut, and add "--disable-web-security" to the Target.
Example: "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --disable-web-security

(Unix) run google-chrome --disable-web-security or chromium --disable-web-security (depending on wether you are using chrome or chromium)

(Mac/others) I don't use a Mac, but you should be able to adapt the above instructions.

This might work in Opera, if Opera 20+ supports the --disable-web-security command.

Do NOT use the disable-web-security switch for active browsing!!! Only use it when working with known good files.

Use that shortcut, and load the "index.html" in the repo into your Chrome window, such as:
file:///D:/src/synergv2/app/index-chrome.html

=== Deploying to webOS ===

Update the version number in app/appinfo.json and package/packageinfo.json, then run one of these bat files:
pack.bat -- to create an ipk file
inst.bat -- to create an ipk file and deploy it to a device
dist.bat -- to create an ipk file, deploy it to device, and run the app.

=== Deploying to other systems ===

Don't even think about trying it with this one.  You want "synergv1".  This repo contains a whole ton
of webOS specific code.

=== Potential issues ===
When running it in Chrome, it asks you to run Java.  If I remember correctly, Java is only necessary
if you are attempting to use the built-in Enyo bridge to actually communciate with a live device
that has a luna-service bus.  I don't think this ever actually worked, or if it did, I never figured
out how to get it working.

When running it in Chrome, it may stick at "Loading Accounts..." with a spinner that spins. (what else
did you expect a spinner would do?)  I'm looking into this.  This may have to do with the Java thing,
but I thought we were disabling that, and forcing it to specifically use the "mock" service data files.
If anyone has a solution, please submit a code review/pull request!
