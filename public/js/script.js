function f() {
	var counter = 1,
		userName = "",
		isMod = "";
	var objDiv, scroll = true,
		tippyText = "";
	var dID, msgID;
	var productionMode = false;
	var pC = 0,
		isBanned;
	if (document.cookie) {
		var th = document.cookie.match(/[=]\w+[;]/gi)[0];
		var theme = th.substring(1, th.length - 1);
		var tflg = (theme === 'dark' ? true : false);
	}

	var notify = new Audio('notify.mp3');

	//this code disables the console in production mode, so that our debug messages don't affect user experience. It's a really clever script, and I'm really proud of it. - _iPhoenix_
	productionMode && (() => {
		x = console, window.console = {}, void Object.keys(x).forEach(function(o) {
			window.console[o] = (() => {});
		});
	})();

	if (theme) {
		document.getElementById('style').href = (theme === "dark" ? 'css/dark.css' : 'css/style.css');
		var el = document.getElementsByClassName('button');
		for (var i = 0; i < el.length; i++) {
			if (theme === "dark") {
				el[i].classList.add('is-dark');
			}
			else {
				el[i].classList.remove('is-dark');
			}
		}
	}

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
	var myConnectionsRef, lastOnlineRef;

	var userSignedIn = function(user) {
		$('#userSignedOut').hide();
		$('#userSignedIn').show();
		users = db.ref('userState/' + user.displayName);
		posts = db.ref('userState/' + user.displayName + '/posts');
		myConnectionsRef = db.ref('users/' + user.displayName + "/");
		parentConnections = db.ref('users/');
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
		}
	});


	msg.once('value', function() {
		objDiv = document.getElementById("messages");
		objDiv.scrollTop = objDiv.scrollHeight;
	});


	var connectedRef = firebase.database().ref('.info/connected');
	connectedRef.on('value', function(snap) {
		if (snap.val() === true) {
			myConnectionsRef.onDisconnect().remove();
			myConnectionsRef.set(true);
		}
	});

	document.getElementById('userSignedIn').addEventListener('click', function() {
		myConnectionsRef.remove();
		auth.signOut();
		location.reload();
	});
	document.getElementById('theme').addEventListener('click', function() {
		tflg = !tflg;
		document.getElementById('style').href = (tflg ? 'css/dark.css' : 'css/style.css');
		var el = document.getElementsByClassName('button');
		for (var i = 0; i < el.length; i++) {
			if (tflg) {
				el[i].classList.add('is-dark');
			}
			else {
				el[i].classList.remove('is-dark');
			}
		}
		var tx = ('theme=' + (tflg ? 'dark;' : 'light;'));
		document.cookie = tx;
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

		parentConnections.on('child_added', function(val) {
			var r = /\s/gi;
			$('.users').append("<div id='" + val.key.replace(r, "") + "'>" + val.key + "</div>");
		});
		parentConnections.on('child_removed', function(val) {
			var r = /\s/gi;
			$('#' + val.key.replace(r, '')).remove();
		});
		// parentConnections.on('child_changed', function(val) {
		// 	console.re.log(val.val());
		// 	val.val() ? $('#users').append("<div id='" + val.key + "'></div>") : $('#' + val.key).remove();
		// 	// $('#users').append(val.val() ? val.key + "<br>" : "");
		// });


		users.transaction(function(d) {
			if (d === null) {
				return {
					isBanned: "false",
					posts: 0
				};
			}
		}, function(err, commit, val) {
			pC = val.val().posts;
			isBanned = val.val().isBanned;
			db.ref("/mods/").once('value').then(x => isMod = (-1 != (x.val().indexOf(auth.currentUser.displayName))));


			msg.orderByChild('ts').limitToLast(30).on('child_added', function(d) {
				// console.re.log(db.ref(d.key) !== null ? true : false);
				var val = d.val();
				val.id = d.key;
				// console.re.log('event fired:' + d.key);

				ctime = new Date(val.ts).toLocaleDateString();
				if (new Date(lastMessage).toLocaleDateString() != ctime) {
					$('#messages').append("<h3 class='date-wrap'><span class='date-span'>" + new Date(val.ts).toLocaleDateString() + "</span></h3>");
				}

				if (!(val.msg.startsWith("/me"))) {
					$('#messages').append("<div class='msg' id=" + val.id + ">" + "<div class='timestamp'>" + new Date(val.ts).toLocaleTimeString() + "</div> <strong id='user" + val.id + "' class='user" + val.id + "' title='" + val.un + "'>" + val.un + "</strong>: " + cleanse(val.msg));
				}

				else {
					$('#messages').append("<div class='msg' id=" + val.id + "><div class='timestamp'>" + new Date(val.ts).toLocaleTimeString() + "</div><strong id='user" + val.id + "' class='user" + val.id + "  action' title='" + val.un + "'>" + val.un + "</strong><span class='action'>" + cleanse(val.msg.substring(4))) + "</span>";
				}

				db.ref("/mods/").once('value').then(x => $('#user' + val.id).prepend((1 + x.val().indexOf(val.un)) ? "<span class='mod'>MOD</span>" : ""));

				if (isMod) {
					$('#' + (val.id)).append("<a class='admin remove' title='Delete' id=" + val.id + " onclick='deleteMsg(" + val.id + ")'><i class='fas fa-times'></i></a><a class='admin hammer' id=" + val.id + " title='Ban' onclick='dropHammer(" + val.un + ");'><i class='fas fa-gavel'></i></a>");
				}

				if (cleanse(val.msg).includes(auth.currentUser.displayName.substring(0, 3))) {
					$('#' + (val.id)).addClass('mention');
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


				msg.on('child_removed', function(val) {
					var el = document.getElementById(val.key);
					el.parentNode.removeChild(el);
					console.re.log(val.key);
				});
			});
		});
		var lastMessage;
		total.transaction(function(d) {
			return d;
		}, function(err, commit, val) {
			msgID = val.val();
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
					db.ref('messages/' + msgID).set({
						'un': auth.currentUser.displayName,
						'msg': message,
						'ts': firebase.database.ServerValue.TIMESTAMP
					});
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
	this.deleteMsg = function(id) {
		console.re.log(id);
		db.ref('messages/' + id).remove();
	};

}

var j = new f();
var auth = firebase.auth();

function send() {
	j.send();
}

function deleteMsg(id) {
	j.deleteMsg(id)
}
