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
   ############################    ROUTER   ###################################################################################### * /

const ROUTER = createRouter({
   routes: [
      {
         path: '/display-grid',
         name: 'displayGridName',
         components: {
            default: displayGridView //<router-view> without name
            //name: component    //independent components for the same view //ex. a sidebar will stay the same across routes.
         }
      },
      {
         path: '/smed-interface',
         name: 'smedInterfaceName',
         component: smedInterfaceView
      }
   ]
})

const __DISPLAY_GRID_VIEW_COMPONENT__ = "";

Vue.component("displayGridView",{

})


/* ################################################################################################################################
   ############################  COMPONENTS  ###################################################################################### */

const __SIGNAL_CELL_COMPONENT__ = "";
var retSignalCellObj=function(){return {
      template: `
            <div v-bind:class="[signalClass, isBlinkingNow?blinkClass:'']" >
               <div class="cell-header" ref="cellheader">
                  {{headerText}}
               </div>
               <div class="label-container">
                  <span class="prefix">
                     <span class="bgr-box" v-bind:class="[signalClass, isBlinkingNow?blinkClass:'']">  VELOCITA'   </span>
                  </span>
                  <div>
                     <span class="value">82</span>    <span class="suffix">m/min</span>
                  </div>
               </div>
               <div class="countdown-container" v-bind:style="{visibility: isCdShown ? 'visible' : 'visible'}">
                  <div class="progress rounded-pill">
                     <div class="relative-wrapper">
                        <div class="countdown-clock">
                           <span>{{cd.minutesClockText}}<span>{{cd.secondsClockText}}</span></span>
                        </div>
                     </div>
                     <div v-bind:style="{ width: cd.progBarWidth+'%' }" class="progress-bar progress-bar-striped progress-bar-animated bg-warning" role="progressbar" v-bind:aria-valuenow="cd.progBarWidth" aria-valuemin="0" aria-valuemax="100" ></div>
                  </div>
               </div>
            </div>
      `,
      //using ResizeObserver(cb)  observe(el)
      props:{
         machineKey: { type:String, default:"UNKN" },
         displayName:{ type:String, default:"this.$props.machineKey" },
         headerText:{ Type:String },
         signalKey:{ default: "noop", validator:(k) => ["noop","A1", "A2", "A3", "A4","B","C1","C2","D","E"].includes(k) },
         timerLength:{ default: 0, type:Number},
         remainingMs:{ default:0, type:Number},
      },


      data: function (){   return {
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
               //timerLength:18*60*1000, 
               //remainingMs:18*60*1000,
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
         signalClass(){return "signal-"+this.signalKey},
         blinkClass(){return `signal-${this.signalKey}-blinkoff`},
      },
      watch:{
         /** changes the whole cell display, programs events and countdowns */
         signalKey:{
            handler:function switchDisplay(newVal, oldVal){ 
               this.inBlinkMode = (["A1","A4"].includes(this.signalKey));
            },
            immediate:true
         },

         headerText:{
            handler:function (oldVal,newVal){ fitTextToCurrentContainerWithScreenRatio(this.$el.getElementsByClassName("cell-header")[0]); }
         },

         remainingMs:{
            handler:function chainUpdate(newVal, oldVal){
               //console.log("remainingMs watcher triggered",{ms:this.$props.remainingMs,tL:this.$props.timerLength});

               this.isCdShown = this.$props.remainingMs > 0;
               this.cd.minutes = Math.trunc( this.$props.remainingMs / (60*1000) );
               this.cd.seconds = Math.round( (this.$props.remainingMs - (this.cd.minutes * 60*1000) ) / 1000 );
               this.cd.minutesClockText = this.cd.minutes + '';
               this.cd.secondsClockText = ':'+fixedDigits(this.cd.seconds,2);

               this.cd.progBarWidth = Math.round(100 * this.$props.remainingMs / this.$props.timerLength);
            },
            immediate:true
         },

         inBlinkMode:{
            handler:function toggle(newVal, oldVal){
               //console.log("inBlinkMode set from",oldVal,newVal);
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
            ctx.touts[XtoX] = setTimeout((ctx)=>{ctx.signalKey=toState;}, 20*60*1000);
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
            const setupper = ()=>{
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
            }
            looseSync(setupper,timeOff+timeOn,ctx,timeOn,timeOff);

         },
         /** undo what setupBlinker did */
         removeBlinker: function (ctx){
            clearInterval(ctx.blinkIntvOn);
            clearInterval(ctx.blinkIntvOff);
            delete ctx.blinkIntvOn;
            delete ctx.blinkIntvOff;
         },
      },

      mounted(){
         fitTextToCurrentContainerWithScreenRatio(this.$el.getElementsByClassName("cell-header")[0], 0, -4);
      }
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
            <div class="countdown-container" v-bind:style="{visibility: isCdShown ? 'visible' : 'hidden'}" style="margin-top:0px; display:flex;">
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
   data:(function (){
      return function (vr){
         let inheritedDataObj = retSignalCellObj().data(); //careful where you place this, or all admin cells will point the same obj.
         return mergeRec(inheritedDataObj,{
            //signalKey:app.initSignal,
            actionList:[
               { id:"goToA2",extraAttr:{},variant:"info",separateIconColor:"",buttonText:"Prendi in Carico", subButtonText:"in Carico", iconName:"bell-slash-fill", iconScale:"0.75", innerSpanHTML:"", isDisabled:false },
               //{ id:"goToA3",extraAttr:{},variant:"info",separateIconColor:"",buttonText:"Anticipa Avviamento", iconName:"alarm-fill", iconScale:"0.75", innerSpanHTML:"", isDisabled:"A3" < this.signalKey },
               { id:"goToE",extraAttr:{},variant:"info",separateIconColor:"",buttonText:"Segnala Completamento", subButtonText:"completato", iconName:"check-lg", iconScale:"0.9", innerSpanHTML:"", isDisabled:"E" < this.signalKey }
            ]
         });}
   })(),
   methods:{
      isActBtnDisabled(key){
         return key < this.signalKey;
      },
      actionClick(e, actionItemId){
         //var event = e.click ?? (()=>{console.warn("[iconpill-button][handleClick()] wrong event key. ignored."); for(let k in e) return e[k]; })()
         e.actionId = actionItemId;
         sendToServer("event","setCellSignal",{toSignalKey:"A2", machineName:this.$props.machineName})
         this.$emit("action-button-click",e);
      }
   },
   watch:(()=>{const inherited = retSignalCellObj().watch; return {
      signalKey:{
         handler: function (){
            for(let btn of this.actionList )
               btn.isDisabled = "goTo"+this.signalKey > btn.id;
            return inherited.signalKey.handler.bind(this)();
         },
         immediate: false || inherited.signalKey.immediate,
      }
   }})()
}));

Vue.component("icon-pill-button",{
   template:`
      <div style="position:relative">
         <!--b-button pill block :disabled="isSubDisabled" variant="info" class="pillicon-button sub" @click="handleSubClick($event)">
            <span class="pillicon-button-icon" v-bind:style="{color:iconColor}"><b-icon :scale="iconScale" :icon="iconName">
                  </b-icon></span>
            {{shownSubButtonText}}
         </b-button-->
         <b-button pill block  :disabled="false" :variant="variant" class="pillicon-button" :class="{retracted:isRetracted}" @click="handleClick($event)" :style="{marginRight:buttonMarginRight}" >
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
      isDisabled:{type:Boolean,default:false},
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
            socketConnectedState : uibuilder.get("ioConnected"), //reactive alias //updated by uib watcher in created hook()
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

               //project specific
            JS_DATE_OFFSET:0,
            CELLS_LAYOUT:CELLS_LAYOUT,
            MACHINE_CFGS:MACHINE_CFGS,
            CELLS_VIEW:CELLS_VIEW,
            adminUI:[],
            //as {mKey:componetProps}
            signalCells:(function (){ //this doesn't get inited.. why?
               var obj={};
               for(let row of CELLS_LAYOUT)
                  for(let mKey of row){
                     let cfg = MACHINE_CFGS[mKey];
                     obj[mKey]={
                        signalKey:cfg.initCellSignalKey,
                        displayName:cfg.displayName,
                        headerText:cfg.cellHeaderText,
                        cd:{
                           timerLength:20000,
                           remainingMs:0,
                           end:Date.now() - NR_TIME_OFFSET//nrDateNow(),
                        }
                     }
                  }
               return obj;
            })(),
        }
    }, // --- End of data --- //
    computed: {

    }, // --- End of computed --- //
    methods: {
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
            ctx.end = nrDateNow() + msFromNow; //unix time in ms when countdown will be completed
            ctx.remainingMs = msFromNow;

            //refresh now and at 1s interval
            clearInterval(ctx.refreshIntv);
            setupCountdownRefresher(ctx, onComplete);
         },
         /** expects ctx to contain ctx.end:number */
         setupCountdownRefresher(ctx,onComplete=noOp){
            looseSync(()=>{
               clearInterval(ctx.refreshIntv);
               ctx.refreshIntv = setInterval(()=>{
                  ctx.remainingMs = Math.max(0, ctx.end - nrDateNow());
                  if(ctx.remainingMs <= 0){
                     clearInterval(ctx.refreshIntv);
                     onComplete();
                  }
               },1000);
            },1000)
            
         },

         clearCountdown:function(ctx){ //#TODO 
            ctx.remainingMs=0;
            clearInterval(ctx.refreshIntv);
            delete ctx.refreshIntv;
         },

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
      var app = this; //app defined, app.$data defined
      
      // Example of retrieving data from uibuilder
      this.feVersion = uibuilder.get('version');
      uiBuilder.vueApp = this; //enables some built-in features like toasts or component debug printout

      uibuilder.onChange('ioConnected', function(connected){
         console.info('[indexjs:uibuilder.onChange:ioConnected] Socket.IO Connection Status Changed to:', connected)
         app.socketConnectedState = connected
      });

      sendToServer("request", "getAppInit");


    }, // --- End of created hook --- //

    
    /** Called once all Vue component instances have been loaded and the virtual DOM built */
    mounted: function(){
      console.debug('[appjs:Vue.mounted] app mounted - setting up uibuilder watchers')

      var app = this  // Reference to `this` in case we need it for more complex functions
      console.info("VUE REFS","use window.vueApp")
      
      
      /**
       * expects { macKey: , fromSignalCellState: {signalKey: ,timerStart: ,timerEnd: }}
       */
      uibuilder.onTopic("setSingleCellState",function(msg){
         //get macKey //#CHECK remove loose attribute-lookup? enforce names?
         let macKey = msg.macKey ?? msg.mKey ?? msg.machineKey ?? msg.mName ?? msg.machineName;
         if(!macKey){
            let col = msg.col ?? msg.column ?? msg.c;
            let row = msg.row ?? msg.row ?? msg.r;
            if(typeof(col)!="number" || typeof("row")!="number"){
               console.error("missing attributes in onTopic(setSingleCellState) response",msg);
               return
            }
            else
               macKey = CELLS_LAYOUT[row][col];
         }
         let errCb = (attr,ret=undefined) => {console.error("missing attribute "+attr+" in onTopic(setSingleCellState) response",msg); return undefined};
         let cell = app.$data.signalCells[macKey];

         msg.fromSignalCellState.diff = msg.fromSignalCellState.timerStart - msg.fromSignalCellState.timerEnd;
         //if no timer-related data was sent or time's up
            //hide timer
         if(!msg.fromSignalCellState.timerEnd || (msg.fromSignalCellState.timerEnd == msg.fromSignalCellState.timerStart)){ //nrDateNow is an approximation that suffers from comunication lag. //when comparing two times close togheter it may result in a false positive
            cell.cd.remainingMs = 0;
            console.log("cd hidden by setSingleCellState",msg.fromSignalCellState, ObjectClone(cell));
            app.clearCountdown(cell.cd);
         }
         else{
            cell.cd.timerLength = msg.fromSignalCellState.timerEnd - msg.fromSignalCellState.timerStart
            cell.cd.remainingMs = Math.max(0, msg.fromSignalCellState.timerEnd - nrDateNow());
            cell.cd.end = msg.fromSignalCellState.timerEnd;
            console.log("cd shown by setSingleCellState",msg.fromSignalCellState, ObjectClone(cell));
            app.setupCountdownRefresher(cell.cd)
         }
         cell.signalKey = msg.fromSignalCellState.signalKey ?? errCb("signalKey");

      });

      

      //#region ---- Debug info, can be removed for live use ---- //
         const uibDebug = false || DBG;

         // If msg changes //msg is updated when a standard msg is received from Node-RED over Socket.IO
         uibDebug && uibuilder.onChange('msg', function(msg){
            console.info('[indexjs:uibuilder.onChange] msg received from Node-RED server:', msg)
            app.msgRecvd = msg
            app.msgsReceived = uibuilder.get('msgsReceived')
         })
         /** You can use the following to help trace how messages flow back and forth.
          * You can then amend this processing to suite your requirements.
          */

         // If we receive a control message from Node-RED, we can get the new data here - we pass it to a Vue variable
         uibDebug && uibuilder.onChange('ctrlMsg', function(msg){
               console.info('[indexjs:uibuilder.onChange:ctrlMsg] CONTROL msg received from Node-RED server:', msg)
               app.msgCtrl = msg
               app.msgsControl = uibuilder.get('msgsCtrl')
         })

         /** You probably only need these to help you understand the order of processing
          * If a message is sent back to Node-RED, we can grab a copy here if we want to
          */
         uibDebug && uibuilder.onChange('sentMsg', function(msg){
               console.info('[indexjs:uibuilder.onChange:sentMsg] msg sent to Node-RED server:', msg)
               app.msgSent = msg
               app.msgsSent = uibuilder.get('msgsSent')
         })

         /** If we send a control message to Node-RED, we can get a copy of it here */
         uibDebug && uibuilder.onChange('sentCtrlMsg', function(msg){
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

         console.info("[app.js:mountedHook] registered onTopic watchers:",...uibuilder.onTopicCbList)

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
