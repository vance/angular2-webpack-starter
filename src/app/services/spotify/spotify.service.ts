import { Injectable } from '@angular/core';
import { Http, Response, Headers, Request, RequestOptions } from '@angular/http';
import { Auth } from '../auth';
import { Observable, Subject } from 'rxjs/Rx';


@Injectable()
export class Spotify {

  value = 'Angular 2';
  baseUrl = 'https://api.spotify.com/v1';

  abortSearches:boolean = false;


  constructor(public http: Http) {

  }

  public getAuthHeader(){
    let headers = new Headers();
    headers.append('Authorization','Bearer ' + this.getAccessToken());
    return headers;
  }

  public isLoggedIn = () => {
    return this.getAccessToken().length > 0;
  }

  getAccessToken = ():string => {
    var expiration = localStorage.getItem('pa_expires');
    if(!expiration){
      return '';
    }

    let expires = parseInt( expiration, 10 );
    if ((new Date()).getTime() > expires ) {
      return '';
    }
    let token = localStorage.getItem('pa_token');
    return token;
  }

  extractData (res:Response, queryObject?:any) {
    let body = res.json();
    if( !queryObject){
      queryObject = {};
    }
    console.log('response', body || 'no response body');
    body = body || { };
    queryObject.body = body;
    return queryObject;
  }

  callAPI (url, queryObject?:any) {

    let options = new RequestOptions({
      url:url,
      headers: this.getAuthHeader(),
      method: 'GET'
    });

    return this.http.request( new Request( options ) )
        .map(res => this.extractData(res, queryObject) )
        .catch(this.handleError);

  }

  public getUser = () => {
      let url = this.baseUrl + '/me';
      return this.callAPI(url);
  }

  public searchAlbum (term:string, queryObject?:any) {

    console.log('NEW SEARCH --> ', term , 'depth:', queryObject.depth );

    var limit ='';
    if( queryObject && queryObject.limit ){
      limit = '&limit=' + queryObject.limit;
    }

    let url = this.baseUrl + '/search?type=album&q=' + encodeURIComponent( term ) + limit;

    if( this.abortSearches){
      return Observable.empty();
    }


    return this.callAPI(url, queryObject);
  }





  public handleError = (error: Response | any) =>{

    let errMsg: string;
    if (error instanceof Response) {
      const body = error.json() || '';
      const err = body.error || JSON.stringify(body);
      errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    console.warn(errMsg);

    return Observable.throw(errMsg);
  }

}
