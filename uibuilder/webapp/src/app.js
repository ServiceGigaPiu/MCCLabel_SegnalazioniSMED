/* jshint browser: true, esversion: 5, asi: true */
/*globals Vue, uibuilder */

/*
  Copyright (c) 2021-2022 Julian Knight (Totally Information)

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
'use strict'

/** @see https://totallyinformation.github.io/node-red-contrib-uibuilder/#/front-end-library */

// eslint-disable-next-line no-unused-vars

/* ################################################################################################################################
   ############################  COMPONENTS  ###################################################################################### */


const __SIGNAL_CELL_COMPONENT__ = "";

var retSignalCellObj=function(){return {
      template: `
            <div v-bind:class="[signalClass, isBlinkingNow?blinkClass:'']" >
               <div class="cell-header">
                  {{headerText}}
               </div>
               <div class="countdown-container" v-bind:style="{visibility: isCdShown ? 'visible' : 'hidden'}">
                  <div class="countdown-clock">
                     <span>{{cd.minutesClockText}}<span>{{cd.secondsClockText}}</span></span>
                  </div>
                  <div class="progress rounded-pill">
                     <div v-bind:style="{ width: cd.progBarWidth+'%' }" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" role="progressbar" v-bind:aria-valuenow="cd.progBarWidth" aria-valuemin="0" aria-valuemax="100" ></div>
                  </div>
               </div>
            </div>
      `,

      props:{
         initSignal: { default: "noop", validator:(k) => ["noop","A1", "A2", "A3", "A4","B","C1","C2","D","E"].includes(k) },
         machineName: { type:String, default:"UNKN" },
      },

      data: function (){   return {
            headerText:"Linea "+this.machineName,
            currSignalKey:this.initSignal,
            isBlinkingNow:false, //toggles blinkOff style
            inBlinkMode:false,
               //blinkIntvOn
               //blinkIntvOff

            //countdown-related //see startCountdown() method for most info
               //f() of _ put here and updated with watch() cuz they belong to the cd object and there is no syntax alternative.
               //cd should probably be its own component, then those could be std computed props.
            isCdShown:"setBy_remainingMs",
            cd:{
                  //refreshIntv
               timerLength:18*60*1000, 
               remainingMs:18*60*1000,
               minutes:0, //f() of remainingMs
               seconds:0, //f() of remainingMs
               minutesClockText:"", //f() of minutes
               secondsClockText:"", //f() of seconds
               onComplete:noop, //non-reactive
               progBarWidth:0, //f() of remainingMs & timerLength
            }
         }
      },
      
      computed: {
         signalClass(){return "signal-"+this.currSignalKey},
         blinkClass(){return `signal-${this.currSignalKey}-blinkoff`},
      },
      watch:{
         /** changes the whole cell display, programs events and countdowns */
         currSignalKey:{
            handler:function switchDisplay(newVal, oldVal){ 
               this.applyStyle(newVal);
            },
            immediate:true
         },

         "cd.remainingMs":{
            handler:function chainUpdate(newVal, oldVal){
               if(this.cd.remainingMs <= 0){
                  this.cd.remainingMs = 0;
                  this.isCdShown = false;
               }
               this.cd.minutes = Math.trunc( this.cd.remainingMs / (60*1000) );
               this.cd.seconds = Math.round( (this.cd.remainingMs - (this.cd.minutes * 60*1000) ) / 1000 );
               this.cd.minutesClockText = this.cd.minutes + '';
               this.cd.secondsClockText = ':'+fixedDigits(this.cd.seconds,2);
               this.cd.progBarWidth = 100 - Math.round(this.cd.remainingMs / this.cd.timerLength);
            },
            immediate:true
         },

         inBlinkMode:{
            handler:function toggle(newVal, oldVal){
               console.log("inBlinkMode set from",oldVal,newVal);
               if(this.inBlinkMode)
                  this.setupBlinker(this, 500, 300);
               else{
                  this.removeBlinker(this);
                  this.isBlinkingNow = false;
               }
            },
            immediate:true
         }
      },

      methods:{
         /**  apply the configs associated to a certain "currSignalKey".
          * invoked by watcher */
         applyStyle: function(){
            let blinkTimeOn = 800, 
               blinkTimeOff = 350;
            
            ////reset what needs to be
            //   //stop blinking if you were
            //if(this.inBlinkMode && !this.currSignalKey.match("A"));
            //   this.inBlinkMode = false;

            //apply associated style
            //auto with computed prop //this.signalClass = "signal-"+this.currSignalKey;
            
            //set blink timeouts and other stuff
            switch(this.currSignalKey){
               case "A1":{
                  this.inBlinkMode = true;
                  this.isCdShown = true; //show countdownBlock
                  this.startCountdown(this.cd, 20*60*1000);
                  this.setApplyStyleTimeout(this,"A3",20*60*1000,this.currSignalKey);
                  break;
               }
               case "A2":{
                  this.inBlinkMode = false;
                  break;
               }
               case "A3":{
                  this.inBlinkMode = false;
                  this.blinkIntvRef = setTimeout(()=>{this.currSignalKey = "A4"}, 20*60*1000);
                  break;
               }
               case "A4":{
                  this.inBlinkMode = true;
                  break;
               }
               default:{
                  this.inBlinkMode = false;
                  this.isCdShown = false;
                     //cancel programmed state-changes
                  if(this.touts)
                  for(key in this.touts)
                     clearTimeout(this.touts[key]);
               }
            }
         },

         /** set programmed state-change timeout.
          *  Stores a ref to the tout in ctx.touts.XtoX where Xs are toState and fromState
          * @param {Object} ctx
          * @param {string} toState {@link applyStyle|applyStyle()}-acceptable state to switch to.
          * @param {number} delay timeout after which apply the style
          * @param {string} fromState used to create a key in 'this' to store the timeout in
          */
         setApplyStyleTimeout: function(ctx, toState, delay, fromState){
            const XtoX = toState + "to" + fromState; //like A1toA3
            if(!this.touts)
               this.touts = {};
            clearTimeout(ctx.touts[XtoX]);
            ctx.touts[XtoX] = setTimeout((ctx)=>{ctx.currSignalKey=toState;}, 20*60*1000);
         },

         /**
          * @desc Immediately adds offClass, then intermittently toggles it.
          * - Declares ctx.blinkIntvOn and ctx.blinkIntvOff
          * - if any of those attributes are already defined it logs an error to console and does nothing;
          * @param {Object} ctx where to store and retrieve stateful information
          * @param {string} offClass class with offTime style. Should have a greater specificity if it overwrites stuff
          * @param {number} timeOn ms to stay on ON state
          * @param {number} timeOff ms 
          */
         setupBlinker: function (ctx, timeOn, timeOff){
            if(ctx.blinkIntvOn != undefined || ctx.blinkIntvOff != undefined){
               console.warn("attachBlink: property clash with name blinkIntv[On|Off]. overwritten.", ctx);
               removeBlinker(ctx);
            }
      
            //add offClass now and every timeOff+timeOn ms
            ctx.isBlinkingNow = true; //adds class to template
            ctx.blinkIntvOff = setInterval(()=>{
               ctx.isBlinkingNow = true;
            },timeOff+timeOn);
      
            //after timeOff: remove class now and every timeOn+timeOff ms
            setTimeout(()=>{
               ctx.isBlinkingNow = false; //removes class from template
               ctx.blinkIntvOn = setInterval(()=>{
                  ctx.isBlinkingNow = false;
               },timeOn+timeOff);
            },timeOff)
         },
         /** undo what setupBlinker did */
         removeBlinker: function (ctx){
            clearInterval(ctx.blinkIntvOn);
            clearInterval(ctx.blinkIntvOff);
            delete ctx.blinkIntvOn;
            delete ctx.blinkIntvOff;
         },

         /**
          * setups the variables and intervals responsible for the countdown elements animations.
          * - adds to cdObj: timerLenght, end, minutes, seconds, refreshIntv.
          * - refreshIntv updates both clock and bar.
          * @param {Object} ctx where to store and retrieve stateful data
          * @param {number} msFromNow delay in ms, lenght of the countdown.
          * @param {function} onComplete optional callback
          */
         startCountdown: function(ctx, msFromNow, onComplete=noOp){
            ctx.timerLength = msFromNow; //bar ratio depends on this
            ctx.end = Date.now() + msFromNow; //unix time in ms when countdown will be completed
            ctx.remainingMs = msFromNow;

            //refresh now and at 1s interval
            clearInterval(ctx.refreshIntv);
            ctx.refreshIntv = setInterval(()=>{
               ctx.remainingMs = Math.max(0, ctx.end - Date.now());
               if(ctx.remainingMs <= 0){
                  clearInterval(ctx.refreshIntv);
                  onComplete();
               }
            },1000);
         }
      },
   };
}
Vue.component("signalCell",retSignalCellObj());
 
const __ADMIN_CELL_COMPONENT__ = Vue.component("admin-cell",mergeRec(retSignalCellObj(),{
   template:`
      <div>
         <div v-bind:class="[signalClass, isBlinkingNow?blinkClass:'']" style="padding-bottom:1vh;">
            <div class="cell-header" style="font-size:5vh; max-height:7vh; text-align:left; ">
               {{headerText}}
            </div>
            <div class="countdown-container" v-bind:style="{visibility: isCdShown ? 'visible' : 'visible'}" style="margin-top:0px; display:flex;">
               <div class="countdown-clock" style="margin-left:5%; display:inline-block;">
                  <span style="font-size:7vh;">{{cd.minutesClockText}}<span>{{cd.secondsClockText}}</span></span>
               </div>
               <div class="progress rounded-pill" style="margin-top:2vh; width:60%">
                  <div v-bind:style="{ width: cd.progBarWidth+'%' }" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" role="progressbar" v-bind:aria-valuenow="cd.progBarWidth" aria-valuemin="0" aria-valuemax="100" ></div>
               </div>
            </div>
         </div>
         
         
            <div class="action-box" style="width:fit-content; margin-top:2vh;">
               <icon-pill-button v-for="(actionItem,idx) in actionList" :key="actionItem.id??console.warn('dbg_missingActBtnId')" v-bind="actionItem" @click="actionClick($event,actionItem.id)"></icon-pill-button>
               
               <!--b-button pill block variant="warning" style="position:relative; font-size:2vh;">
                  <span style="margin-left:-.375rem; border:0.2em solid transparent; border-radius:100%;background-color:white;color:var(--warning);"><b-icon scale="0.75" icon="bell-slash-fill"><b-icon></span>
                  <span>Consegna Materiale</span>
               </b-button>
               <b-button pill block variant="success" style="position:relative; font-size:2vh;">
                  <span style="margin-left:-.375rem; border:0.2em solid transparent; border-radius:100%;background-color:white;color:var(--success);"><b-icon scale="0.9" icon="check-lg"><b-icon></span>
                  <span>Segnala Completamento</span>
               </b-button-->
               <!-- v-if="false" b-button pill block variant="danger" p-1 style="position:relative; font-size:3vh; ">
                  <b-iconstack font-scale="1.5" style="position:absolute; left:.5rem; top:.375rem;">
                     <b-icon stacked icon="circle-fill" variant="light" style="background-color:white" ></b-icon>
                     <b-icon stacked icon="bell-slash-fill" scale="0.5" variant="danger"></b-icon>
                  </b-iconstack>
                  <span>Prendi In Carico</span>
               </b-button-->
            </div>
        
         
         </div>
      </div>
   `,
   data:(function (){let inheritedDataObj = retSignalCellObj().data();
         return function (app){return mergeRec(inheritedDataObj,{
            headerText:"Linea "+app.machineName,
            currSignalKey:app.initSignal,
            actionList:[
               { id:"goToA2",extraAttr:{},variant:"danger",separateIconColor:"",buttonText:"Prendi in Carico", subButtonText:"in Carico", iconName:"bell-slash-fill", iconScale:"0.75", innerSpanHTML:""},
               { id:"goToA3",extraAttr:{},variant:"warning",separateIconColor:"",buttonText:"Anticipa Avviamento", iconName:"alarm-fill", iconScale:"0.75", innerSpanHTML:"" },
               { id:"goToE",extraAttr:{},variant:"success",separateIconColor:"",buttonText:"Segnala Completamento", subButtonText:"completato", iconName:"check-lg", iconScale:"0.9", innerSpanHTML:"" }
            ]
         });}
   })(),
   methods:{
      actionClick(e, actionItemId){
         //var event = e.click ?? (()=>{console.warn("[iconpill-button][handleClick()] wrong event key. ignored."); for(let k in e) return e[k]; })()
         e.action = actionItemId;
         this.$emit("action-button-click",e);
      }
   }
}));

Vue.component("icon-pill-button",{
   template:`
      <div style="position:relative">
         <!--b-button pill block :disabled="isSubDisabled" variant="info" class="pillicon-button sub" @click="handleSubClick($event)">
            <span class="pillicon-button-icon" v-bind:style="{color:iconColor}"><b-icon :scale="iconScale" :icon="iconName">
                  </b-icon></span>
            {{shownSubButtonText}}
         </b-button-->
         <b-button pill block  :disabled="isDisabled" :variant="variant" class="pillicon-button" :class="{retracted:isRetracted}" @click="handleClick($event)" :style="{marginRight:buttonMarginRight}" >
            <span class="pillicon-button-icon" v-bind:style="{color:iconColor}"><b-icon :scale="iconScale" :icon="iconName">
               </b-icon></span>
            <span v-if="innerSpanHTML" v-html="shownInnerSpanHTML" ></span>
            <span v-else>{{shownButtonText}}</span>
         </b-button>
      </div>
   `,
   props:{
      /*extraAttr:{},*/
      variant:String,
      separateIconColor:String,
      buttonText:String,
      iconName:String,
      iconScale:String|Number,
      innerSpanHTML:String,
      isActive:Boolean,
      subButtonText:{type:String,default:" "},
   },
   computed:{
      iconColor(){ return (this.separateIconColor ? this.separateIconColor : `var(--${this.variant})`)},
      retractedClass(){ return (this.isRetracted ? "retracted" : "")},
      shownButtonText(){ return (this.isRetracted ? "" : (this.isLoading ? "" : this.$props.buttonText) ) },
      shownInnerSpanHTML(){ return (this.isLoading ? this.loadingHTML : this.$props.innerSpanHTML || this.shownButtonText)},
      shownSubButtonText(){ return (this.isRetracted ? this.$props.subButtonText : "")},
      isSubDisabled(){ return (this.isRetracted ? false : true)},
      retrMinMargin(){ return this.subButtonText.length*1.2 + "ch"},
      buttonMarginRight(){ return (this.isRetracted ? this.retrMinMargin : 'inherit')},
   },
   data(){return {
         isRetracted:false,
         isDisabled:false,
         isLoading:false,

         loadingHTML:`
            <b-icon icon="three-dots" animation="cylon" font-scale="1.5"></b-icon>`
      }
   },
   /*data: function(){return {
         extraAttr:{},
         variant:"danger",
         separateIconColor:"",
         buttonText:"Prendi in Carico",
         iconName:"bell-slash-fill",
         iconScale:"0.75",
         innerSpanHTML:""
      }
   },*/
   methods:{
      handleClick(event){
         //this.isLoading = true;
         this.$emit("click", { event:event, srcComponent:this });
         //this.isDisabled = true;
      },
      handleSubClick(event){
         //this.isRetracted = false;
         //this.isDisabled = false;
      }
   }
})

/* ################################################################################################################################
   ##############################  VUE APP  ####################################################################################### */

const app = new Vue({
    el: '#app',

    data: function (){ return {
                //default vue-uibuilder app setup
            startMsg    : 'Vue has started, waiting for messages',
            feVersion   : '',
            counterBtn  : 0,
            inputText   : null,
            inputChkBox : false,
            socketConnectedState : false,
            serverTimeOffset     : '[unknown]',
            imgProps             : { width: 75, height: 75 },

            msgRecvd    : '[Nothing]',
            msgsReceived: 0,
            msgCtrl     : '[Nothing]',
            msgsControl : 0,

            msgSent     : '[Nothing]',
            msgsSent    : 0,
            msgCtrlSent : '[Nothing]',
            msgsCtrlSent: 0,

            isLoggedOn  : false,
            userId      : null,
            userPw      : null,
            inputId     : '',

            CELLS_LAYOUT:CELLS_LAYOUT,

            cells: (function (){
               var ret = new Array(NROWS);
               for(let r=0; r<NROWS; r++){
                  ret[r] = new Array(NCOLS);
                  for(let c=0; c<NCOLS; c++){
                     ret[r][c]= 
                     {
                        /*currSignalKey:"noop",
                        signalClass:"signal-noop",
                        blinkClass:"signal-noop-blinkoff",
                        isBlinking:false,
                        headerText:"Linea MO41",
                        //countdown-related //see startCountdown() method for most info
                           //f() of _ put here and updated with watch() cuz they belong to the cd object and there is no syntax alternative.
                           //cd should probably be its own component, then those could be std computed props.
                        isCdShown:false,
                        cd:{
                              //refreshIntv
                           timerLength:1, 
                           remainingMs:0,
                           minutes:0, //f() of remainingMs
                           seconds:0, //f() of remainingMs
                           onComplete:noop, //non-reactive
                           progBarWidth:0, //f() of remainingMs & timerLength
                        }*/
                     }
                  }
               }
               return ret;
            })()

            //vcharts: charts,

        }
    }, // --- End of data --- //
    computed: {
      /* add space to comment -> */
      hLastRcvd: function() {
         var msgRecvd = this.msgRecvd
         if (typeof msgRecvd === 'string') return 'Last Message Received = ' + msgRecvd
         return 'Last Message Received = ' + this.syntaxHighlight(msgRecvd)
      },
      hLastSent: function() {
         var msgSent = this.msgSent
         if (typeof msgSent === 'string') return 'Last Message Sent = ' + msgSent
         return 'Last Message Sent = ' + this.syntaxHighlight(msgSent)
      },
      hLastCtrlRcvd: function() {
         var msgCtrl = this.msgCtrl
         if (typeof msgCtrl === 'string') return 'Last Control Message Received = ' + msgCtrl
         return 'Last Control Message Received = ' + this.syntaxHighlight(msgCtrl)
      },
      hLastCtrlSent: function() {
         var msgCtrlSent = this.msgCtrlSent
         if (typeof msgCtrlSent === 'string') return 'Last Control Message Sent = ' + msgCtrlSent
         return 'Last Control Message Sent = ' + this.syntaxHighlight(msgCtrlSent)
      },

      /**/

    }, // --- End of computed --- //
    methods: {
        sendToServery(type,topic,msg){
         console.log("sendToServer() called");
         sendToServer(type,topic,msg);
        },
        // Called from the increment button - sends a msg to Node-RED
        increment: function(event) {
            console.log('Button Pressed. Event Data: ', event)

            // Increment the count by one
            this.counterBtn += 1
            var topic = this.msgRecvd.topic || 'uibuilder/vue'
            uibuilder.send( {
                'topic': topic,
                'payload': {
                    'type': 'counterBtn',
                    'btnCount': this.counterBtn,
                    'message': this.inputText,
                    'inputChkBox': this.inputChkBox
                }
            } )

        }, // --- End of increment --- //

        // REALLY Simple method to return DOM events back to Node-RED. See the 2nd b-button on the default html
        doEvent: uibuilder.eventSend,

        // return formatted HTML version of JSON object
        syntaxHighlight: function(json) {
            json = JSON.stringify(json, undefined, 4)
            json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            json = json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
                var cls = 'number'
                if ((/^"/).test(match)) {
                    if ((/:$/).test(match)) {
                        cls = 'key'
                    } else {
                        cls = 'string'
                    }
                } else if ((/true|false/).test(match)) {
                    cls = 'boolean'
                } else if ((/null/).test(match)) {
                    cls = 'null'
                }
                return '<span class="' + cls + '">' + match + '</span>'
            })
            return json
        }, // --- End of syntaxHighlight --- //

    }, // --- End of methods --- //

    // Available hooks: beforeCreate,created,beforeMount,mounted,beforeUpdate,updated,beforeDestroy,destroyed, activated,deactivated, errorCaptured

    /** Called after the Vue app has been created. A good place to put startup code */
    created: function() {

      /*for(let r in this.cells)
         for(let c of this.cells[r]){
            this.$watch(`cells.${r}.${c}.currSignalKey`,{
               handler:function (newVal, oldVal){

               },
               deep:false,
               immediate:true
            })
         }
*/
      // Example of retrieving data from uibuilder
      this.feVersion = uibuilder.get('version')

      /** **REQUIRED** Start uibuilder comms with Node-RED @since v2.0.0-dev3
      * Pass the namespace and ioPath variables if hosting page is not in the instance root folder
      * e.g. If you get continual `uibuilderfe:ioSetup: SOCKET CONNECT ERROR` error messages.
      * e.g. uibuilder.start('/uib', '/uibuilder/vendor/socket.io') // change to use your paths/names
      * @param {Object=|string=} namespace Optional. Object containing ref to vueApp, Object containing settings, or String IO Namespace override. changes self.ioNamespace from the default.
      * @param {string=} ioPath Optional. changes self.ioPath from the default
      * @param {Object=} vueApp Optional. Reference to the VueJS instance. Used for Vue extensions.
      */
      uibuilder.start(this) // Single param passing vue app to allow Vue extensions to be used.
      
      const uiBuilder = uibuilder; //alias because camelCase it's the way and i got it wrong too effing many times
      //brutely define method onTopic //use global onTopicCbList to have a reference of all registered onChange for dbg purposes
      uibuilder.onTopicCbList = [];
      uibuilder.onTopic = function (topic, callback){
         uibuilder.onTopicCbList.push(topic);
         return uibuilder.onChange('msg',(e) => {
            //e === msg received
            if(e.topic == topic)
               callback(e);
         });
      }
      
      //#DBG //#TMP look for typos
      uiBuilder.onChange(msg => {
         if(uibuilder.onTopicCbList.indexOf(msg.topic) >= 0)
            console.warn("[typo prevention]: unhandled topic ",msg.topic,msg);
      })


    }, // --- End of created hook --- //

    
    /** Called once all Vue component instances have been loaded and the virtual DOM built */
    mounted: function(){
      //console.debug('[indexjs:Vue.mounted] app mounted - setting up uibuilder watchers')

      var app = this  // Reference to `this` in case we need it for more complex functions
      
      uibuilder.onTopic("setCellSignal",function(msg){
         app.cell
      })

      // If msg changes //msg is updated when a standard msg is received from Node-RED over Socket.IO
      uibuilder.onChange('msg', function(msg){
         console.info('[indexjs:uibuilder.onChange] msg received from Node-RED server:', msg)
         app.msgRecvd = msg
         app.msgsReceived = uibuilder.get('msgsReceived')
      })

      //#region ---- Debug info, can be removed for live use ---- //

         /** You can use the following to help trace how messages flow back and forth.
          * You can then amend this processing to suite your requirements.
          */

         // If we receive a control message from Node-RED, we can get the new data here - we pass it to a Vue variable
         uibuilder.onChange('ctrlMsg', function(msg){
               console.info('[indexjs:uibuilder.onChange:ctrlMsg] CONTROL msg received from Node-RED server:', msg)
               app.msgCtrl = msg
               app.msgsControl = uibuilder.get('msgsCtrl')
         })

         /** You probably only need these to help you understand the order of processing
          * If a message is sent back to Node-RED, we can grab a copy here if we want to
          */
         uibuilder.onChange('sentMsg', function(msg){
               console.info('[indexjs:uibuilder.onChange:sentMsg] msg sent to Node-RED server:', msg)
               app.msgSent = msg
               app.msgsSent = uibuilder.get('msgsSent')
         })

         /** If we send a control message to Node-RED, we can get a copy of it here */
         uibuilder.onChange('sentCtrlMsg', function(msg){
               console.info('[indexjs:uibuilder.onChange:sentCtrlMsg] Control message sent to Node-RED server:', msg)
               app.msgCtrlSent = msg
               app.msgsCtrlSent = uibuilder.get('msgsSentCtrl')
         })

         /** If Socket.IO connects/disconnects, we get true/false here */
         //uibuilder.onChange('ioConnected', function(connected){
         //      console.info('[indexjs:uibuilder.onChange:ioConnected] Socket.IO Connection Status Changed to:', connected)
         //      app.socketConnectedState = connected
         //})
         /** If Server Time Offset changes */
         uibuilder.onChange('serverTimeOffset', function(serverTimeOffset){
               console.info('[indexjs:uibuilder.onChange:serverTimeOffset] Offset of time between the browser and the server has changed to:', serverTimeOffset)
               app.serverTimeOffset = serverTimeOffset
         })

         /** If user is logged on/off */
         uibuilder.onChange('isAuthorised', function(isAuthorised){
               console.info('[indexjs:uibuilder.onChange:isAuthorised] isAuthorised changed. User logged on?:', isAuthorised)
               console.log('authData: ', uibuilder.get('authData'))
               console.log('authTokenExpiry: ', uibuilder.get('authTokenExpiry'))
               app.isLoggedOn = isAuthorised
         })

      //#endregion ---- Debug info, can be removed for live use ---- //
         /*
            applyStyle("A1", document.getElementById("r1c1"));
            applyStyle("A4", document.getElementById("r1c3"));
            applyStyle("B", document.getElementById("r1c2"));
            applyStyle("C1", document.getElementById("r1c4"));
            applyStyle("C2", document.getElementById("r2c1"));
            applyStyle("D", document.getElementById("r2c2"));
            applyStyle("E", document.getElementById("r2c3"));
            applyStyle("F", document.getElementById("r2c4"));
         */
    }, // --- End of mounted hook --- //

}); // --- End of app1 --- //
