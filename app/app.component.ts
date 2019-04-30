import { Component } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormControl, FormArray } from '@angular/forms';
import {  CurrencyPipe } from '@angular/common';
import {Http, RequestOptionsArgs, Headers, Response } from "@angular/http";
import { Observable } from "rxjs/Observable";
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/map'
import { LocalStorageService } from 'ngx-webstorage';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  name = 'AEM project estimator';
  exampleForm: FormGroup;
  totalSum: number = 0;
  myFormValueChanges$;

  constructor(
    private formBuilder: FormBuilder,
    private http: Http,
    private storage: LocalStorageService,
    private currencyPipe: CurrencyPipe
  ) { }

  /**
   * Form initialization
   */
  ngOnInit () {
    // create form with validators and dynamic rows array
    this.exampleForm = this.formBuilder.group({
      companyName: ['', [Validators.required,Validators.maxLength(25)]],
      countryName: [''],
      city: [''],
      zipCode: [''],
      street: [''],
      units: this.formBuilder.array([
         // load first row at start
         this.getUnit()
      ])
    });
    // initialize stream on units
    this.myFormValueChanges$ = this.exampleForm.controls['units'].valueChanges;
    // subscribe to the stream so listen to changes on units
    this.myFormValueChanges$.subscribe(units => this.updateTotalUnitPrice(units));

    // preload some data into form fields
    const geoIpInfo = this.storage.retrieve('geoIpInfo');
    if(geoIpInfo) {
      this.exampleForm.patchValue({
        countryName: geoIpInfo.country_name,
        city: geoIpInfo.city,
        zipCode: geoIpInfo.postal,
        companyName: geoIpInfo.org
      });
    } else {
      this.getCountryByIpOnline().subscribe((res) => {
          console.log('This is your IP information: ', res );
          // put responce into storage so no nedded request it again on reload
          this.storage.store('geoIpInfo', res); 
          // update form data
          this.exampleForm.patchValue({
            countryName: res.country_name,
            city: res.city,
            zipCode: res.postal,
            companyName: geoIpInfo.org
          });  
      }, (err) => {
          this.exampleForm.patchValue({countryName: 'N/A', city: 'N/A', zipCode: 'N/A'});
      });
    }
  }

  /**
   * unsubscribe listener
   */
  ngOnDestroy(): void {
    this.myFormValueChanges$.unsubscribe();
  }

  /**
   * Save form data
   */
  save(model: any, isValid: boolean, e: any) {
    e.preventDefault();
    alert('Form data are: '+JSON.stringify(model));
  }

  /**
   * Create form unit
   */
  private getUnit() {
    const numberPatern = '^[0-9.,]+$';
    return this.formBuilder.group({
      unitName: ['', Validators.required],
      qty: [1, [Validators.required, Validators.pattern(numberPatern)]],
      unitPrice: ['', [Validators.required, Validators.pattern(numberPatern)]],
      unitTotalPrice: [{value: '', disabled: true}]
    });
  }

  /**
   * Add new unit row into form
   */
  private addUnit() {
    const control = <FormArray>this.exampleForm.controls['units'];
    control.push(this.getUnit());
  }

  /**
   * Remove unit row from form on click delete button
   */
  private removeUnit(i: number) {
    const control = <FormArray>this.exampleForm.controls['units'];
    control.removeAt(i);
  }

  /**
   * Update prices as soon as something changed on units group
   */
  private updateTotalUnitPrice(units: any) {
    // get our units group controll
    const control = <FormArray>this.exampleForm.controls['units'];
    // before recount total price need to be reset. 
    this.totalSum = 0;
    for (let i in units) {
      let totalUnitPrice = (units[i].qty*units[i].unitPrice);
      // now format total price with angular currency pipe
      let totalUnitPriceFormatted = this.currencyPipe.transform(totalUnitPrice, 'USD', 'symbol-narrow', '1.2-2');
      // update total sum field on unit and do not emit event myFormValueChanges$ in this case on units
      control.at(+i).get('unitTotalPrice').setValue(totalUnitPriceFormatted, {onlySelf: true, emitEvent: false});
      // update total price for all units
      this.totalSum += totalUnitPrice;
    }
  }

  /**
   * Get online geoIp information to pre-fill form fields country, city and zip 
   */
  private getCountryByIpOnline(): Observable<any> {
    return this.http.get('https://ipapi.co/json/')
        .map(this.extractData)
        .catch(this.handleError);
  }

  /**
   * responce data extraction from http responce
   */
  private extractData(res: Response) {
    let body = res.json();
    return body || { };
  }

  /**
   * handle error if geoIp service not available. 
   */
  private handleError (error: Response | any) {
    // In a real world app, you might use a remote logging infrastructure
    let errMsg: string;
    if (error instanceof Response) {
      const body = error.json() || '';
      const err = body.error || JSON.stringify(body);
      errMsg = `${error.status} - ${error.statusText || ''} ${err}`;
    } else {
      errMsg = error.message ? error.message : error.toString();
    }
    console.error(errMsg);
    return Observable.throw(errMsg);
  }
}
