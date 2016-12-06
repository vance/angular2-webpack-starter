import { Injectable } from '@angular/core';
import { Http } from '@angular/http';
import { Spotify } from '../spotify';
import {BehaviorSubject} from 'rxjs/Rx';

@Injectable()
export class Auth {

    apiURL = 'https://api.spotify.com/v1/';

    CLIENT_ID = '';
    REDIRECT_URI = '';


    public authenticated:BehaviorSubject<boolean> = new BehaviorSubject(false);


    constructor (public http: Http, public spotify: Spotify) {
        this.init();
    }

    init = () => {

        this.initializeAuthCallback();


        if (location.host == 'localhost:3000') {
            this.CLIENT_ID =	'529aa00414504177850d4bd61b2b4623';
            this.REDIRECT_URI = 'http://localhost:3000/callback.html';
        } else {
            this.CLIENT_ID = '529aa00414504177850d4bd61b2b4623';
            this.REDIRECT_URI = 'http://vance.github.io/vancify/callback.html';
        }
    }



    initializeAuthCallback =() =>{

        window.addEventListener("message", (event) => {
            //need to try catch because webpack posts a bunch of junkdd
            try {

                if( typeof event.data === 'string'){

                    let hashMap = JSON.parse(event.data);
                    if (hashMap.type == 'access_token') {
                        this.setAccessToken(hashMap.access_token, hashMap.expires_in || 3600 );

                        this.authenticated.next(true);
                    }
                }

            } catch (err) {
                this.authenticated.next(false);
            }

        }, false);

    }


    getLoginURL = (scopes) => {
        return 'https://accounts.spotify.com/authorize?client_id=' + this.CLIENT_ID
            + '&redirect_uri=' + encodeURIComponent(this.REDIRECT_URI)
            + '&scope=' + encodeURIComponent(scopes.join(' '))
            + '&response_type=token';
    }

    public openLogin = () => {
        let url = this.getLoginURL([
            'user-read-private',
            'playlist-read-private',
            'playlist-modify-public',
            'playlist-modify-private',
            'user-library-read',
            'user-library-modify',
            'user-follow-read',
            'user-follow-modify'
        ]);

        let width = 450,
            height = 730,
            left = (screen.width / 2) - (width / 2),
            top = (screen.height / 2) - (height / 2);

        let w = window.open(url,
            'Spotify',
            'menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left
        );
    }



    setAccessToken =  (token, expires_in) =>  {
        localStorage.setItem('pa_token', token);
        var addMilliseconds = parseInt( expires_in, 10 ) * 1000;
        localStorage.setItem('pa_expires', ((new Date()).getTime() + addMilliseconds ).toString()  );
    }

    getUsername = () => {
        let username = localStorage.getItem('pa_username');
        return username;
    }

    setUsername = (username) => {
        localStorage.setItem('pa_username', username);
    }

    getUserCountry = () => {
        let userCountry = localStorage.getItem('pa_usercountry');
        return userCountry;
    }

    setUserCountry = (userCountry) => {
        localStorage.setItem('pa_usercountry', userCountry);
    }




}
