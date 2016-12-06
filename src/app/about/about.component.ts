import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'about',
  styles: [`
    .about{
        padding:15px;
    }
  `],
  template: `
    <div class="about">
      <h4>How it works</h4>
  
      <p>
      A recursive search for two terms. Every album that is returned will search for albums using all 
      the words in the title, minus the original term. Once there is a match between the two trees, 
      the trees are connected. </p>
  
      <h4>Known Issues</h4>
      <div>
      
      <ul>
          <li>
            Nodes can float off. Didn't have time to figure out d3 version 4 code style boundary boxes. 
          </li>
          <li>
              Searching for unknown words or typos can lead to a rate limit throttle because there's no error handling around this. It 
              will instantly recurse empty results. You can escape this by reloading/resetting.
          </li>
          <li>Many nodes can cause slow performance. No time to limit breadth-wise recursion. (depth-wise) is limited.</li>
          <li>
           Simple words, like 'a' and 'album' are filtered for english. Searching albums in other languages may yield unrelated results because of joining on simple words.
          </li>
          <li>
              No reset functionality except with refresh.
          </li>
          
          <li>
              Floating nodes - some nodes are orphaned. They're never in the tree, so the linked albums don't break.
          </li>
          
      </ul>
      
    
      
    </div>
  `
})
export class AboutComponent {
  localState: any;
  constructor(public route: ActivatedRoute) {

  }

  ngOnInit() {
    this.route
      .data
      .subscribe((data: any) => {
        // your resolved data from route
        this.localState = data.yourData;
      });

    console.log('hello `About` component');
    // static data that is bundled
    // var mockData = require('assets/mock-data/mock-data.json');
    // console.log('mockData', mockData);
    // if you're working with mock data you can also use http.get('assets/mock-data/mock-data.json')
    this.asyncDataWithWebpack();
  }
  asyncDataWithWebpack() {
    // you can also async load mock data with 'es6-promise-loader'
    // you would do this if you don't want the mock-data bundled
    // remember that 'es6-promise-loader' is a promise
    setTimeout(() => {

      System.import('../../assets/mock-data/mock-data.json')
        .then(json => {
          console.log('async mockData', json);
          this.localState = json;
        });

    });
  }

}
