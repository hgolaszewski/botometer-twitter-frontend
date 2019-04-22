import {Component, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Color, Label} from 'ng2-charts';
import {ChartDataSets} from 'chart.js';
import {User} from './model/User';
import {Score} from './model/Score';
import {MetricsStatistics} from './model/MetricsStatistics';

@Injectable()
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  chart = null;
  appLoading: boolean = false;
  errorMessage: string = null;
  userNameToAdd: string = null;
  userNameToFilter: string = null;
  estimatedTimeToLoad: number = 100000;
  elapsedTimeToLoad: number = 0;
  users: Array<User> = [];
  usersFiltered: Array<User> = [];
  scores: Array<Score> = [];
  lineChartData = [{
      data: [],
      borderWidth: 1,
      label: 'Account statistics',
  }];
  lineChartOptions = {
    legend: {
      labels: {
        fontColor: 'white'
      }
    },
    responsive: true,
    scales: {
      xAxes: [{
        display: true,
        scaleLabel: {
          display: true
        },
        ticks: {
          fontColor: 'white'
        }
      }],
      yAxes: [{
        display: true,
        ticks: {
          beginAtZero: true,
          stepSize: 1.0,
          max: 5.0,
          min: 0.0,
          fontColor: 'white'
        }
      }]
    },
  };
  lineChartColors = [];
  lineChartLabels = [];
  lineChartPlugins = [];
  lineChartLegend = true;
  lineChartType = 'line';

  constructor(private http: HttpClient) {
    this.getUserList();
  }

  filterAccounts() {
    this.usersFiltered = this.users.filter(user => user.username.toLowerCase().includes(this.userNameToFilter.toLowerCase()));
  }

  addUser(username: string) {
    let finalizeRequest = () => {
      this.errorMessage = null;
      this.userNameToAdd = null;
      this.appLoading = false;
    };
    this.findStats("addUser").then(() =>
      this.http.post('https://botometer-backend.herokuapp.com/user/add/' + username, {})
        .toPromise()
        .then(() => {
          finalizeRequest();
          this.getUserList().then(() => this.listScoreForUser(username));
        }, (errorResponse) => {
          finalizeRequest();
          this.errorMessage = errorResponse.error.message;
        })
    );
  }

  deleteUser(id: string) {
    let finalizeRequest = () => {
      this.errorMessage = null;
      this.userNameToAdd = null;
      this.appLoading = false;
    };
    this.findStats("deleteUser").then(() =>
      this.http.delete('https://botometer-backend.herokuapp.com/user/delete/' + id)
        .toPromise()
        .then(() => {
          finalizeRequest();
          this.getUserList();
        }, (errorResponse) => {
          finalizeRequest();
          this.errorMessage = errorResponse.error.message;
        })
    );
  }

  getUserList() {
    return this.findStats('listUser').then(() =>
      this.http.get<User[]>('https://botometer-backend.herokuapp.com/user/list')
        .toPromise()
        .then(response => {
          this.errorMessage = null;
          this.users = response;
          this.usersFiltered = response;
          this.userNameToFilter = null;
          this.appLoading = false;
        })
    );
  }

  onAccountSelect(user: User) {
    if (!this.isProgressBarVisible()) {
      this.listScoreForUser(user.username);
    }
  }

  listScoreForUser(username: string) {
    let finalizeRequest = () => {
      this.errorMessage = null;
      this.elapsedTimeToLoad = this.estimatedTimeToLoad;
      this.appLoading = false;
    };
    this.findStats('listScoreForUser').then(() =>
      this.http.get<Score[]>('https://botometer-backend.herokuapp.com/score/list/' + username)
        .toPromise()
        .then(response => {
          this.scores = response;
          this.lineChartData[0].data = this.scores.map(data => data.score);
          this.lineChartData[0].label = username;
          this.lineChartLabels = this.scores.map(data => {
            let offSet = new Date().getTimezoneOffset();
            let timeGMT = data.date + (offSet * 60000);
            return new Date(timeGMT).toISOString().substr(0, 10);
          });
          finalizeRequest();
        }, (errorResponse) => {
          finalizeRequest();
          console.log(errorResponse);
          if (errorResponse.error.status == 503) {
            this.errorMessage = 'Request timed out or service is unavailable, reload page';
          } else {
            this.errorMessage = errorResponse.error.message;
          }
        })
    );
  }

  findStats(statName: string) {
    return this.http.get<MetricsStatistics>('https://botometer-backend.herokuapp.com/stats/find/' + statName)
      .toPromise()
      .then(response => {
        this.appLoading = true;
        this.errorMessage = null;
        this.estimatedTimeToLoad = response.estimatedTime;
        let thisComponent = this;
        let progress = setInterval(function () {
          thisComponent.elapsedTimeToLoad = thisComponent.elapsedTimeToLoad + 10;
          if (!thisComponent.appLoading) {
            thisComponent.elapsedTimeToLoad = thisComponent.estimatedTimeToLoad;
            clearInterval(progress);
            setTimeout(() => {
              thisComponent.elapsedTimeToLoad = 0;
              thisComponent.estimatedTimeToLoad = 100000;
              }, 150);
          }
          }, 10)
      });
  }

  getProgressBarPercentageValue() {
    let value = Math.ceil(((this.elapsedTimeToLoad / this.estimatedTimeToLoad) * 100));
    return value > 100 ? 100 : value;
  }

  isProgressBarVisible() {
    return (this.appLoading === true || this.elapsedTimeToLoad <= this.estimatedTimeToLoad) && this.elapsedTimeToLoad > 0;
  }

}





