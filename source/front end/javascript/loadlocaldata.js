
document.addEventListener('DOMContentLoaded', function() {

    var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));

    if (loggedInUser) {
        document.getElementById('profileName').innerText = loggedInUser.name || 'Not Available';
        document.getElementById('UserName').innerText = loggedInUser.name || 'Not Available';
        document.getElementById('profileUsername').innerText = loggedInUser.username || 'Not Available';
        document.getElementById('profileEmail').innerText = loggedInUser.email || 'Not Available';
        document.getElementById('profilePhone').innerText = loggedInUser.phone || 'Not Available';

        document.getElementById('profilePosition').innerText = loggedInUser.position || 'Not Available'
        document.getElementById('profileRegister').innerText = loggedInUser.register || 'Not Available'

        var loginTime = localStorage.getItem('loginTime');
        var userIp = localStorage.getItem('userIp');
    

        loginTime = loginTime || 'Not Available';
        userIp = userIp || 'Not Available';
        document.getElementById('profileTime').innerText = loginTime;
        document.getElementById('profileUserIp').innerText = userIp;

    } else {

        console.error('No user is logged in.');
    }
});


