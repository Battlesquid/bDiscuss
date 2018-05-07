function f() {
    var ui, uiConfig, refChildCounter, counter = 1,
        userFlag = false,
        userName = " ",
        isMod = "",
        isUser = false;
    var val, childData, userRef;
    var objDiv, scroll = true,
        tippyText = "";
    var dID, globalID, delMsg, msgID;
    var lastMessage;
    var productionMode = false;
    var postCounter = 0;
    var notify = new Audio('notify.mp3');


    //this code disables the console in production mode, so that our debug messages don't affect user experience. It's a really clever script, and I'm really proud of it. - _iPhoenix_
    productionMode && (() => {
        x = console, window.console = {}, void Object.keys(x).forEach(function (o) {
            window.console[o] = (() => { })
        })
    })();

    firebase.initializeApp({
        apiKey: "AIzaSyCI8N2f4HGdG7KVtjoea-g4eCkxvQhLOQw",
        authDomain: "tibd-discuss-beta.firebaseapp.com",
        databaseURL: "https://tibd-discuss-beta.firebaseio.com",
        projectId: "tibd-discuss-beta",
        storageBucket: "tibd-discuss-beta.appspot.com",
        messagingSenderId: "617814984936"
    });

    //firebase authentication & database
    var auth = firebase.auth(),
        database = firebase.database();
    // var messaging = firebase.messaging();
    //config the firebase app
    var userSignedIn = function (user) {
        console.log("User signed in");
        document.getElementById("userSignedOut").style.display = 'none';
        document.getElementById("userSignedIn").style.display = 'block';
        userFlag = true;
    }

    var userSignedOut = function () {
        console.log("User signed out");
        document.getElementById("userSignedIn").style.display = 'none';
        document.getElementById("userSignedOut").style.display = 'block';
    }

    auth.onAuthStateChanged(function (user) {
        user ? userSignedIn(user) : userSignedOut();
        if (user) {
            console.log(user.displayName);
            console.log("Called from AuthStateChanged");
            userName = auth.currentUser.displayName;
            initUser();
        }
    });
    // Add the public key generated from the console here.
    // messaging.usePublicVapidKey("BPUoQtFfkhpn8VFELKRWOjHpV1Ol-wCZ4Y4xtzu0gd-ySlc4kmXcBW6uw_UG_BESHWla08_Nt9YiNcnFiuf9Pcs");
    // messaging.requestPermission().then(function () {
    //     console.log('Notification permission granted.');
    //     // TODO(developer): Retrieve an Instance ID token for use with FCM.
    //     // ...
    // }).catch(function (err) {
    //     console.log('Unable to get permission to notify.', err);
    // });
    var openSettings = function () {
        $('.setting').modal({
            fadeDuration: 100
        });
    }

    var messageRef = database.ref('messages');
    var msgRef = database.ref('global/total');

    var messageInput = document.getElementById('messageInput');
    this.send = function () {
        if (!isBanned) {
            var message = messageInput.value;
            if (message != "") {
                msgRef.transaction(function (currentData) {
                    console.log("msgID Transaction:" + msgID); // you don't need the .toString() because JS is loosely typed and converts it to a string implicitly.

                    return currentData + 1;
                }, function (error, committed, snapshot) {
                    if (error) {
                        console.log('Transaction failed abnormally!', error);
                    } else if (!committed) {
                        console.log('Aborted the transaction (because ' + userName + ' already exists).');
                    } // why was there an empty else statement here?
                }, false);
                msgRef.on('value', function (data) {
                    msgID = data.val();
                    console.log("msgRef value updated:" + msgID);
                });
                database.ref('messages/' + msgID).set({
                    'un': auth.currentUser.displayName,
                    'msg': message,
                    'ts': firebase.database.ServerValue.TIMESTAMP
                });
            }
            messageInput.value = '';
            postRef.transaction(function (currentData) {
                postCounter = currentData + 1;
                document.getElementById("count").innerHTML = postCounter.toString();
                return currentData + 1;
            });

        }
    }
    //sendMessage is a button, can also use an onclick event
    messageRef.once('value', function () {
        objDiv = document.getElementById("messages");
        objDiv.scrollTop = objDiv.scrollHeight;
    });

    $(function () {
        $("#messageInput").keypress(function (e) {
            if (e.which == 13) {
                send();
            }
        });
        $('.msg').linkify();
        tippy('.btn');
        tippy('.remove');
        tippy('.hammer');
    });
    /* $(document).ready(function () {
        $('.admin.remove').click(function (event) {
            dID = parseInt(event.target.id);
            messageRef.transaction(function (currentData) {
                console.log(currentData.val());
            });
            console.log(messageRef.orderByChild('id').equalTo(dID));
        });
    }) */
    function scrollToBottom() {
        $('#messages').scrollTop($('#messages')[0].scrollHeight);
    }

    this.deleteMsg = function (id) {
        dID = parseInt(id);
        database.ref('global/deleteID').transaction(function (currentData) {
            globalID = dID;
            console.log("dID Value: " + globalID);
            return dID;
        }, function (error, committed, snapshot) {
            if (error) {
                console.log('Transaction failed abnormally!', error);
            } else if (!committed) {
                console.log('globalID not updated');
            } else { }
        }, false);
        database.ref('messages/' + dID).remove();
    }

    // Shamelessly ripped from UniChat by _iPhoenix_, to prevent XSS.
    function cleanse(message) {
        var n = document.createElement("DIV");
        n.innerText = message;
        return n.innerHTML;
    }

    var initUser = function () {
        $('.tiny.image').append("<img src='" + auth.currentUser.photoURL + "'>");
        $('.ui.button').popup({
            inline: true,
            on: 'click'
        });
        $('.menu .item').tab();
        $('.ui.checkbox').checkbox();

        userRef = database.ref('userState/' + userName);
        postRef = database.ref('userState/' + userName + '/posts');
        msgRef.transaction(function (currentData) {
            msgID = currentData;
            return currentData;
        }, function (error, committed, snapshot) {
            if (error) {
                console.log('Transaction failed abnormally!', error);
            } else if (!committed) {
                console.log('msgID not updated');
            } else {
                console.log('User' + userName + ' added!');
            }
        });
        //firebase.database().ref('/mods/').on('')
        userRef.transaction(function (currentData) {
            if (currentData === null) {
                return {
                    isBanned: false,
                    posts: 0
                };
            } else {
                console.log('User ' + userName + ' already exists.');
                return;
            }
        }, function (error, committed, snapshot) {
            if (error) {
                console.log('Transaction failed abnormally!', error);
            } else if (!committed) {
                console.log('Aborted the transaction (because ' + userName + ' already exists).');
            } else {
                console.log('User' + userName + ' added!');
            }
            console.log(userName + "'s data: ", snapshot.val());
            postCounter = snapshot.val().posts;
            $('#postCount').append("<strong>Posts: </strong><span id='count'>" + postCounter + "</span>");
            database.ref("/mods/").once('value').then(x => isMod = (-1 != (x.val().indexOf(auth.currentUser.displayName))));
            isBanned = snapshot.val().isBanned;
            messageRef.orderByChild('ts').limitToLast(30).on('child_added', function (data) {
                var val = data.val();
                val.id = data.key;
                if (counter > 29) {
                    $('#' + (counter - 30)).remove();
                }


                currentTime = new Date(val.ts).toLocaleDateString();
                if (new Date(lastMessage).toLocaleDateString() != currentTime) {
                    console.log("NEW DAY");
                    console.log(new Date(val.ts).toLocaleDateString());
                    $('#messages').append("<h3 class='date-wrap'><span class='date-span'>" + new Date(val.ts).toLocaleDateString() + "</span></h3>");
                }
                if (!(val.msg.startsWith("/me"))) {
                    $('#messages').append("<div class='msg' id=" + val.id + ">" + "<span class='timestamp'>" + new Date(val.ts).toLocaleTimeString() + "</span> <strong id='user" + val.id + "' class='user" + val.id + "' title='" + val.un + "'>" + val.un + "</strong>: " + cleanse(val.msg));
                } else {
                    $('#messages').append("<div class='msg' id=" + val.id + ">" + "<span class='timestamp'>" + new Date(val.ts).toLocaleTimeString() + "</span><strong id='user" + val.id + "' class='user" + val.id + "  action' title='" + val.un + "'>" + val.un + "</strong> " + "<span class='action'>" + cleanse(val.msg.substring(4))) + "</span>";
                }

                database.ref("/mods/").once('value').then(x => $('#user' + val.id).prepend((1 + x.val().indexOf(val.un)) ? "<span class='mod'>MOD</span>" : ""));
                if (isMod) {
                    $('#' + (val.id)).append("<a class='admin remove' title='Delete' id=" + val.id + " onclick='j.deleteMsg(" + val.id + ")'><i class='fas fa-times'></i></a><a class='admin hammer' id=" + val.id + " title='Ban' onclick='dropHammer(" + val.un + ");'><i class='fas fa-gavel'></i></a>");
                }
                if (cleanse(val.msg).includes(auth.currentUser.displayName.substring(0, 3))) {
                    $('#' + (val.id)).css({
                        "background-color": "#ddd"
                    });
                    if (document.getElementById('highlight').checked == true) {
                        notify.play();
                    }
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
            messageRef.on('child_removed', function (data) {
                database.ref('global/deleteID').transaction(function (currentData) {
                    globalID = currentData;
                    console.log("dID Value: " + globalID);
                    return dID;
                });
                console.log(globalID);
                delMsg = document.getElementById(globalID);
                delMsg.parentNode.removeChild(delMsg);
            });

            // database.ref('global/deleteID').on("value", function (snapshot) {
            //     snapshot.forEach(function (child) {
            //         console.log(child.key + ": " + child.val());
            //     });
            // });
        });
    }
}
var j = new f();

function send() {
    j.send();
}

function saveUserSettings() {
    if (document.getElementById("toggletheme").checked == true) {
        document.getElementById("style").href = "css/dark.css";
    } else if (document.getElementById("toggletheme").checked == false) {
        document.getElementById("style").href = "css/style.css";
    }
}