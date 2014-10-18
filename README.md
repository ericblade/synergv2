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
