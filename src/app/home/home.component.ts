import { Component, ApplicationRef } from '@angular/core';
import { AppState } from '../app.service';
import { Title } from './title';
import { XLarge } from './x-large';
import { Auth } from '../services/auth';
import { Spotify } from '../services/spotify';
import { Observable } from 'rxjs/Observable';
import { VisualizerForce } from '../visualizer-force';


@Component({
  // The selector is what angular internally uses
  // for `document.querySelectorAll(selector)` in our index.html
  // where, in this case, selector is the string 'home'
  selector: 'home',  // <home></home>
  // We need to tell Angular's Dependency Injection which providers are in our app.
  providers: [
    Title
  ],
  // Our list of styles in our component. We may add more to compose many styles together
  styleUrls: [ './home.component.css' ],
  // Every Angular template is first compiled by the browser before Angular runs it's compiler
  templateUrl: './home.component.html'
})
export class HomeComponent {

  MAX_DEPTH = 20;

  loggedIn:boolean = false;
  user:any = {};

  queryInput:any = {
    search1:'',
    search2:''
  }

  resultMap:any = {};

  //TODO: move to const class
  bannedWords = ['the', 'and', 'if','but', 'when', 'a', 'my','your','of',
    'to', 'out', 'in', 'between','over','under','an', '', 'or','else','no','is',
    'are','was','has','i','you', 'me','it','it\'s' ,'not','yes','no',
    'remix', 'album', 'remix', 'tape','record', 'hey', ' ', 'various', 'artists', 'ep', 'lp',
    'mixtape', 'song', 'songs', 'deluxe', 'pack','box', 'on', 'remixes', 'for' , 'version',
    'edition', 'copy', 'platinum', 'gold', 'vinyl', 'compact', 'cd', 'disk', 'from', 'back'
    'cover'];


  terminalAlbum:any = {};

  // root level maps of results
  searchResults1:any = {};
  searchResults2:any = {};

  // flat list of all words to do non-recursive match checking
  // before we barrel down on the CPU
  flatResults1:string[] = [];
  flatResults2:string[] = [];

  //supplied search terms
  searchTerms1:string[] = [];
  searchTerms2:string[] = [];


  abort:boolean = false;


  clickedItem:null;

  linkList:any[];
  nodeList:any[];

  matchingWords:any = null;
  connectingAlbums:any = null;

  selectedAlbum:any = null;

  // TypeScript public modifiers
  constructor(public appState: AppState, public title: Title, public auth: Auth, public spotify: Spotify ) {

  }

  /*
   check if token is expired and get 'me' user
   */
  checkStatus () {

    if( this.spotify.isLoggedIn() && !this.user.id ){

      this.loggedIn = true;
      this.spotify.getUser()
          .subscribe(
              result => this.user = result.body,
              error => console.log('error', <any>error) );
    }
  }

  ngOnInit () {
    this.auth.authenticated.subscribe((value)=>{
      this.loggedIn = value;
      this.checkStatus();
    });
    this.checkStatus();
  }

  restart(){
    window.location.reload();
  }

  onAlbumSelected(node){
    console.log( 'selected', node )

    node.data.image = '';
    if( node.data.images[0]){
      node.data.image = node.data.images[0].url;
    }


    this.selectedAlbum = node.data;
  }


  //
  //    SEARCH STUFF --------------------------------------------------
  //

  doAbort(){
    this.abort = true;
    this.spotify.abortSearches = true;
  }

  getTerminalAlbum(){
    return JSON.stringify( this.terminalAlbum);
  }


  onLoginClick() {
    this.auth.openLogin();
  }

  search() {

    this.spotify.searchAlbum( this.queryInput.search1, {term: this.queryInput.search1, limit:50, field: 1, depth:0} ).subscribe(
        result => this.onInitialSearchComplete(result) ,
        error => console.log( 'error', <any>error )
    );

    this.spotify.searchAlbum( this.queryInput.search2, {term: this.queryInput.search2, limit:50, field:2, depth:0} ).subscribe(
        result => this.onInitialSearchComplete(result) ,
        error => console.log( 'error', <any>error )
    );

  }

  onInitialSearchComplete(result:any ){

    let resultRoot = this.searchResults1;

    if( result.field === 2){
      resultRoot = this.searchResults2;
    }

    let items = result.body.albums.items;

    items.forEach((item)=>{
      item.depth = 0;
      item.words = this.getRelevantWords(item, false);
      resultRoot[item.id] = item;
    });

    this.recursiveSearch( resultRoot, result.term, result.field );
  }

  /*

  breadth first search

      @parentMap: where to map results
      @originalTerm: searchTerm for the current result set
      @field: to which result group this search belongs
  */
  foundAlbum:boolean = false;

  recursiveSearch( parentMap:any , originalTerm:string , field:number ){

    if( this.abort || this.connectingAlbums ){
      return;
    }

    let i = 0;


    for (let key in parentMap) {
      if (parentMap.hasOwnProperty(key)) {


          let item = parentMap[key];

          if( item.depth < this.MAX_DEPTH){

            //create the new result map
            if(!item.resultMap){
              parentMap[key].resultMap = {};
            }

            let words:string[] = this.getRelevantWords(item);
            this.storeSearchedWords(words, field);


                words.forEach((w)=>{

                  //js fast copy to make sure our let vars are block scoped.
                  //have to throttle for the API rate limiting
                  let queryOptions = JSON.parse(JSON.stringify({term:w, field:field, parentId:key, searchCount:words.length, limit:3 , depth: item.depth +1 }));


                  setTimeout(()=>{

                    if( this.connectingAlbums){
                      return;
                    }

                    this.spotify.searchAlbum( w, queryOptions).subscribe(
                        result => this.onRecursiveSearchComplete(result, parentMap ) ,
                        error => console.log( 'error', <any>error )
                    );

                  }, i * (item.depth+1) * 1000 );

                })



          }


        i++;
      }
    }
  }



  onRecursiveSearchComplete( result, parentMap ){

    if( this.connectingAlbums){
      return;
    }

    // map result items to child map
    result.body.albums.items.forEach((item)=>{
      item.words = this.getRelevantWords(item, false );
      item.depth = result.depth;
      this.storeResultWords( item.words, result.field );

      //don't add a result if it's the same album
      if( item.id !== result.parentId){
        parentMap[result.parentId].resultMap[item.id] = item;
      }

    });

    //check if result maps equal the number of words queried
    if( Object.keys(parentMap[result.parentId].resultMap).length >= result.searchCount  ){

      if( result.field == 1){
        console.log('parentMap1', parentMap );
      } else {
        console.log( 'parentMap2', parentMap );
      }

      // abort searches if match is found
      this.checkTerminalAlbum();
      if( this.connectingAlbums){
        return;
      }

      this.setNodes( this.searchResults1, this.searchResults2 );
      this.recursiveSearch(parentMap[result.parentId].resultMap, result.term, result.field );

    }

  }

  storeSearchedWords(words, field){
    // catalog all words we've searched
    if( field === 1){
      this.searchTerms1 = this.searchTerms1.concat( words);
    } else {
      this.searchTerms2 = this.searchTerms2.concat( words);
    }
  }

  storeResultWords(words, field){
    // catalog all words we've FOUND
    if( field === 1){
      this.flatResults1 = this.flatResults1.concat( words);
    } else {
      this.flatResults2 = this.flatResults2.concat( words);
    }
  }



  /* compare the two result trees to find a common word */
  checkTerminalAlbum() {

    // for performance reasons, we check the flat list
    // if there's a match, we recurse and build the tree

    this.matchingWords = this.simpleMatch()

    if( this.matchingWords ){

      var connector1 = this.buildPath( this.searchResults1, this.eitherCompare, this.matchingWords );
      var connector2 = this.buildPath( this.searchResults2, this.eitherCompare, this.matchingWords );

      console.log('pathway', connector1, connector2 );

      this.connectingAlbums = {
        c1: connector1.item,
        c2: connector2.item
      }

      this.setNodes( this.searchResults1, this.searchResults2 );


      return true;
    }

    return false;
  }


  /* recursively walk the tree and record the path */
  buildPath( tree, compare, words){

    var matchedItem = null;
    var matchedPath = null;

    function recurse( tree , path ){

      var items = [];

      for (let key in tree) {
        if (tree.hasOwnProperty(key)) {

          var item = tree[key];
          items.push( item );

          if( compare( item.words, words ) ){
            matchedItem = item;
            path.push(key);
            matchedPath = path;
          }
        }
      }

      if( matchedItem){
        return;
      } else {


        items.forEach((item) => {
          path.push(item.id);
          recurse( item.resultMap, path );

        });


      }
    }

    recurse( tree , []);

    return {
      path:matchedPath,
      item:matchedItem
    };

  }


  // this was the naive first attempt
  // searchInTree( aTree, compare , words ){
  //
  //     var aInnerTree = []; // will contain the inner children
  //     var oNode; // always the current node
  //     var aReturnNodes = []; // the nodes array which will returned
  //     var path = {};
  //     var foundNode = null;
  //     var stack = '';
  //
  //     for (let key in aTree) {
  //       if (aTree.hasOwnProperty(key)) {
  //         aInnerTree.push(aTree[key]);
  //       }
  //     }
  //
  //     while(aInnerTree.length > 0) {
  //       oNode = aInnerTree.pop();
  //
  //       if( compare(oNode.words, words ) ){
  //         foundNode = oNode;
  //       }
  //
  //       if(!foundNode){
  //
  //         if( oNode['resultMap'] ){
  //           var innerMap = oNode.resultMap;
  //           for (let key in innerMap) {
  //             if (innerMap.hasOwnProperty(key)) {
  //               aInnerTree.push(innerMap[key]);
  //             }
  //           }
  //         }
  //
  //       }
  //     }
  //     return foundNode;
  // }

  //NODES
  /*
   {"id": "Myriel", "group": 1},
   {"id": "Napoleon", "group": 1},
   {"id": "Mlle.Baptistine", "group": 1},
   {"id": "Mme.Magloire", "group": 1},
   */

  //LINKS
  /*
   {"source": "Napoleon", "target": "Myriel", "value": 1},
   {"source": "Mlle.Baptistine", "target": "Myriel", "value": 8},
   {"source": "Mme.Magloire", "target": "Myriel", "value": 10},
   */


  setNodes(tree1, tree2 = null){

    let nodes = [], links = [];
    var connectingAlbums = this.connectingAlbums;

    if( tree1 ){

      //root node all tree 1 is connected to
      nodes[0] = {
        id:this.queryInput.search1,
        group:0,
        data :{
          name: this.queryInput.search1,
          artists:['Search Term 2'],
          images:['']
        }
      }

      createNodes( tree1, 0, nodes[0].id );
    }


    if( tree2 ){

      //root node all tree 2 is connected to
      let node = {
        id:this.queryInput.search2,
        group:2,
        data :{
          name: this.queryInput.search1,
          artists:['Search Term 1'],
          images:['']
        }
      };

      nodes.push(node);

      createNodes( tree2, 0, node.id );
    }


    //recurse tree into flat nodes
    function createNodes( tree, group, parent ){

      for (let key in tree) {
        if (tree.hasOwnProperty(key)) {

          var item = tree[key];

          if( item ){

            var node = {
              id:item.name,
              group:group,
              data: item
            }

            var link = {
              source:item.name,
              target:parent,
              value: 1
            }

            links.push(link);
            nodes.push(node);

            //group ++;

            if( item.resultMap ){

              createNodes( item.resultMap , group , item.name);
            }

          }

        }
      }

    }

    //add final connection if applicable
    if( this.connectingAlbums ){
      console.log('adding connection', this.connectingAlbums )
      links.push({
        source:this.connectingAlbums.c2.name,
        target:this.connectingAlbums.c1.name,
        value:2
      })

    }

    this.linkList = links;
    this.nodeList = nodes;

  }





  simpleMatch(){

    //console.log(this.flatResults1 , '\n\n', this.flatResults2 );

    var hasMatch = false;

    for( let i = 0; i< this.flatResults1.length; i++){
      var w1= this.flatResults1[i];

      for( let z =0; z < this.flatResults2.length; z++){
        var w2 = this.flatResults2[z];

        if( this.isWordMatch(w1, w2) ){
          console.log('flat match found ===> ', w1+ ' ' +  w2 )
          hasMatch = true;
          break;
        }
      }
      if( hasMatch){
        break;
      }
    }

    if( hasMatch){
      return {
        w1: w1,
        w2: w2
      };
    } else {
      return null;
    }


  }


  //don't care which tree, does it match either search term?
  eitherCompare = ( value, words) => {

    for( let i = 0; i < value.length ; i++){

      if( this.isWordMatch( value[i] , words.w1 ) || this.isWordMatch( value[i] , words.w2 ) ){
        return true;
      }
    }

    return false;
  }

  isWordMatch( w1, w2){
    //if it contains the other word, it must be at least 5 characters long
    return (w1 === w2 || (w1.indexOf(w2) >=0 && w2.length > 5 ) || (w2.indexOf(w1) >= 0 && w1.length > 5)) && w1 !== '' && w2 != '' && w1.length > 3 && w2.length > 3;
  }




  getRelevantWords(item:any, doRemoveSearchedWords:boolean = true ):string[]{
    //get all relevant words
    let words:string[] = [];
    let term:string = '';

    term += item.name;
    term = term.toLowerCase();
    words = this.stripSpecialCharacters( term ).split(' ');

    // a little inefficient, but I want to enable/disable them without complicating code each function
    if( doRemoveSearchedWords){
      words = this.removeSearchedWords(words );
    }

    words = this.removeBannedWords(words);
    words = this.removeOriginalTerms(words);

    return words;
  }

  stripSpecialCharacters(inString:string ):string{
    return inString.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
  }


  removeOriginalTerms( inWords:string[]){
    let filteredWords =[ this.queryInput.search1, this.queryInput.search2 ];
    return this.removeWords( inWords, filteredWords);
  }

  removeBannedWords(inWords:string[]){
    return this.removeWords( inWords, this.bannedWords);
  }

  /* words we've already searched */
  removeSearchedWords(inWords:string[]):string[] {
    let outWords = [];

    let filteredWords = [];
    filteredWords = filteredWords.concat( this.searchTerms1 );
    filteredWords = filteredWords.concat( this.searchTerms2 );

    return this.removeWords( inWords, filteredWords);
  }


  removeWords( inWords:string[], bannedList:string[] ){
    let outWords = [];
    inWords.forEach((w)=>{

      let banned = false;
      w = w.trim().toLowerCase();

      for( let i =0; i < bannedList.length; i++){
        if( w === bannedList[i].trim().toLowerCase()){
          banned = true;
          break;
        }
      }

      if( !banned ){
        outWords.push(w);
        return;
      }

    });

    return outWords;
  }




}
