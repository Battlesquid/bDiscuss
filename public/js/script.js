function f() {
	var counter = 1,
		userName = " ",
		isMod = "";
	var objDiv, scroll = true,
		tippyText = "";
	var dID, msgID;
	var productionMode = false;
	var pC = 0,
		isBanned;
	var notify = new Audio('notify.mp3');

	//this code disables the console in production mode, so that our debug messages don't affect user experience. It's a really clever script, and I'm really proud of it. - _iPhoenix_
	productionMode && (() => {
		x = console, window.console = {}, void Object.keys(x).forEach(function(o) {
			window.console[o] = (() => {});
		});
	})();

	firebase.initializeApp({
		apiKey: "AIzaSyCI8N2f4HGdG7KVtjoea-g4eCkxvQhLOQw",
		authDomain: "tibd-discuss-beta.firebaseapp.com",
		databaseURL: "https://tibd-discuss-beta.firebaseio.com",
		projectId: "tibd-discuss-beta",
		storageBucket: "tibd-discuss-beta.appspot.com",
		messagingSenderId: "617814984936"
	});

	var auth = firebase.auth();
	var db = firebase.database();
	var msg = db.ref('messages'),
		total = db.ref('global/total');
	console.re.log(userName);

	var userSignedIn = function(user) {
		$('#userSignedOut').hide();
		$('#userSignedIn').show();
		users = db.ref('userState/' + user.displayName);
		posts = db.ref('userState/' + user.displayName + '/posts');
		var myConnectionsRef = firebase.database().ref('users/' + user.displayName + '/connections');

		// stores the timestamp of my last disconnect (the last time I was seen online)
		var lastOnlineRef = firebase.database().ref('users' + user.displayName + '/lastOnline');
	};

	var userSignedOut = function() {
		$('#userSignedOut').show();
		$('#userSignedIn').hide();
	};

	auth.onAuthStateChanged(function(user) {
		user ? userSignedIn(user) : userSignedOut();
		if (user) {
			userName = auth.currentUser.displayName;
			initUser();
			console.re.log(userName);
		}
	});


	msg.once('value', function() {
		objDiv = document.getElementById("messages");
		objDiv.scrollTop = objDiv.scrollHeight;
	});


	var connectedRef = firebase.database().ref('.info/connected');
	connectedRef.on('value', function(snap) {
		if (snap.val() === true) {
			// We're connected (or reconnected)! Do anything here that should happen only if online (or on reconnect)
			var con = myConnectionsRef.push();

			// When I disconnect, remove this device
			con.onDisconnect().remove();

			// Add this device to my connections list
			// this value could contain info about the device or a timestamp too
			con.set(true);

			// When I disconnect, update the last time I was seen online
			lastOnlineRef.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
		}
	});

	$(function() {
		$("#messageInput").keypress(function(e) {
			if (e.which == 13) {
				send();
			}
		});
		$('.msg').linkify();
		tippy('.btn');
		tippy('.remove');
		tippy('.hammer');
	});

	function scrollToBottom() {
		$('#messages').scrollTop($('#messages')[0].scrollHeight);
	}

	// Shamelessly ripped from UniChat by _iPhoenix_, to prevent XSS.
	function cleanse(message) {
		var n = document.createElement("DIV");
		n.innerText = message;
		return n.innerHTML;
	}

	function initUser() {
		users.transaction(function(d) {
			if (d === null) {
				return {
					isBanned: false,
					posts: 0
				};
			}
		}, function(err, commit, val) {
			console.re.log(userName + "'s data: ", val.val());
			pC = val.val().posts;
			isBanned = val.val().isBanned;
			// $('#postCount').append("<strong>Posts: </strong><span id='count'>" + pC + "</span>");
			db.ref("/mods/").once('value').then(x => isMod = (-1 != (x.val().indexOf(auth.currentUser.displayName))));
			console.re.log(isBanned);
		});
		var lastMessage;
		total.transaction(function(d) {
			return d;
		}, function(err, commit, val) {
			msgID = val.val();
		});

		msg.orderByChild('ts').limitToLast(30).on('child_added', function(d) {
			var val = d.val();
			val.id = d.key;
			if (counter > 29) {
				$('#' + (counter - 30)).remove();
			}

			ctime = new Date(val.ts).toLocaleDateString();
			if (new Date(lastMessage).toLocaleDateString() != ctime) {
				$('#messages').append("<h3 class='date-wrap'><span class='date-span'>" + new Date(val.ts).toLocaleDateString() + "</span></h3>");
			}

			if (!(val.msg.startsWith("/me"))) {
				$('#messages').append("<div class='msg' id=" + val.id + ">" + "<span class='timestamp'>" + new Date(val.ts).toLocaleTimeString() + "</span> <strong id='user" + val.id + "' class='user" + val.id + "' title='" + val.un + "'>" + val.un + "</strong>: " + cleanse(val.msg));
			}

			else {
				$('#messages').append("<div class='msg' id=" + val.id + ">" + "<span class='timestamp'>" + new Date(val.ts).toLocaleTimeString() + "</span><strong id='user" + val.id + "' class='user" + val.id + "  action' title='" + val.un + "'>" + val.un + "</strong> " + "<span class='action'>" + cleanse(val.msg.substring(4))) + "</span>";
			}

			db.ref("/mods/").once('value').then(x => $('#user' + val.id).prepend((1 + x.val().indexOf(val.un)) ? "<span class='mod'>MOD</span>" : ""));

			if (isMod) {
				$('#' + (val.id)).append("<a class='admin remove' title='Delete' id=" + val.id + " onclick='j.deleteMsg(" + val.id + ")'><i class='fas fa-times'></i></a><a class='admin hammer' id=" + val.id + " title='Ban' onclick='dropHammer(" + val.un + ");'><i class='fas fa-gavel'></i></a>");
			}

			if (cleanse(val.msg).includes(auth.currentUser.displayName.substring(0, 3))) {
				$('#' + (val.id)).css({
					"background-color": "#ddd"
				});
				notify.play();
			}

			$('.msg').linkify();
			tippy('.admin');
			tippy(".user" + val.id);
			if (scroll) {
				objDiv = document.getElementById("messages");
				objDiv.scrollTop = objDiv.scrollHeight;
			}
			lastMessage = val.ts;
		});
	}
	var messageInput = document.getElementById('messageInput');
	this.send = function() {
		if (!isBanned) {
			var message = messageInput.value;
			if (message !== "") {
				total.transaction(function(d) {
					return d + 1;
				}, function(err, commit, val) {
					msgID = val.val();
				});
				db.ref('messages/' + msgID).set({
					'un': auth.currentUser.displayName,
					'msg': message,
					'ts': firebase.database.ServerValue.TIMESTAMP
				});
			}
			messageInput.value = '';
			posts.transaction(function(d) {
				return d + 1;
			}, function(err, commit, val) {
				pC = val.val();
			});
		}
	};
}

var j = new f();
var auth = firebase.auth();

function send() {
	j.send();
}
