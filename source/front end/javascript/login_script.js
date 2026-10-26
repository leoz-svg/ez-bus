// Teaching-only login: no server authentication or secure password storage.
var users = [{name: "Demo visitor", username: "demo", email: "demo@example.com",
 phone: "Not collected", position: "Demo", password: "demo-only", register: "2023"}];


function changePassword() {
    var oldPassword = document.getElementById('old-password').value;
    var newPassword = document.getElementById('new-password').value;
    var confirmNewPassword = document.getElementById('confirm-new-password').value;


    var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

    if (!loggedInUser) {
        alert("No user is logged in.");
        return;
    }


    if (oldPassword !== loggedInUser.password) {
        alert("Invalid Old Password");
    } else {

        if (newPassword !== confirmNewPassword) {
            alert("The new passwords do not match.");
        } else {

            loggedInUser.password = newPassword;


            localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));


            var users = JSON.parse(localStorage.getItem('users'));
            var userIndex = users.findIndex(user => user.email === loggedInUser.email);
            if (userIndex !== -1) {
                users[userIndex] = loggedInUser;
                localStorage.setItem('users', JSON.stringify(users));
            }

            alert("Password change successful");
        }
    }
}


function onLoginSuccess() {
    var currentdate = new Date(); 
    var date = currentdate.getDate();
    var month = currentdate.getMonth() + 1;
    var year = currentdate.getFullYear();
    var hours = currentdate.getHours();
    var minutes = currentdate.getMinutes();
    var seconds = currentdate.getSeconds();


    date = (date < 10 ? '0' : '') + date;
    month = (month < 10 ? '0' : '') + month;
    hours = (hours < 10 ? '0' : '') + hours;
    minutes = (minutes < 10 ? '0' : '') + minutes;
    seconds = (seconds < 10 ? '0' : '') + seconds;


    var datetime = "" + year + "/" + month + "/" + date + "  " + hours + ":" + minutes + ":" + seconds;

    localStorage.setItem('loginTime', datetime);

    localStorage.setItem('userIp', 'Not collected in portfolio edition');

}



var usersStr = JSON.stringify(users);

localStorage.setItem('users', usersStr);


function validateUserCredentials() {
    const inputEmail = document.querySelector('.ipt[type="text"]').value;
    const inputPassword = document.querySelector('.ipt[type="password"]').value;


    var storedUsers = JSON.parse(localStorage.getItem('users'));


    const user = storedUsers.find(user => user.email === inputEmail);

    if (user) {

        if (user.password === inputPassword) {
            alert("Login successful!");

   
            localStorage.setItem('loggedInUser', JSON.stringify(user));
            onLoginSuccess()
            window.location.href = 'index.html'; 
        } else {
            alert("Invalid password.");
        }
    } else {
        alert("No user with this email.");
    }
}

function handleLogout() {
    window.location.href = './login.html';
}

