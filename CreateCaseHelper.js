({
    doInit : function(component, event) {
        var action = component.get('c.getMetadata');
        action.setCallback(this, function(response) {
            var state = response.getState();
            if(state === "SUCCESS") {
                var response = response.getReturnValue();
                var wrapper = JSON.parse(response);
                var cats = wrapper.categories;
                var catStrToSubCats = wrapper.catStrToSubCats
                var subCatStrToDetCats = wrapper.subCatStrToDetCats;
                
                component.set("v.webCaseWrapper", wrapper);
                component.set("v.categories", cats);
                
                if($A.get("$SObjectType.CurrentUser.Id")) {
                    this.categoryChange(component, event);
                    var action = component.get('c.getUserInfo');
                    action.setParams({
                        userId : $A.get("$SObjectType.CurrentUser.Id")
                    });
                    action.setCallback(this, function(response) {
                        var state = response.getState();
                        if(state === "SUCCESS") {
                            
                            var response = response.getReturnValue();
                            var user = JSON.parse(response)[0];
                            component.set("v.name", user.Name);
                            component.set("v.email", user.Email);
                            component.set("v.twitchId", user.TwitchUserID__c);
                            component.set("v.twitchLoginAuthorized", true);
                            component.set("v.loginAuthorized", true);
                            
                            this.getURLParameters(component, event);
                            
                            if(user.TwitchUserID__c) {
                                var action = component.get('c.getContactInfo');
                                action.setParams({
                                    twitchId : user.TwitchUserID__c
                                });
                                action.setCallback(this, function(response) {
                                    var state = response.getState();
                                    if(state === "SUCCESS") {
                                        var response = response.getReturnValue();
                                        var contact = JSON.parse(response)[0];
                                        component.set("v.contact", contact);
                                        this.hideCaseFields(component, event);
                                        
                                    }  
                                    else {
                                        window.scrollTo(0,0);
                                        helper.showError(component, event, helper, $A.get('$Label.c.TWIT_Get_Contact_Info_Error'));
                                    }
                                });
                                
                                $A.enqueueAction(action);
                            }
                            
                        }  
                        else {
                            window.scrollTo(0,0);
                            helper.showError(component, event, helper, $A.get('$Label.c.TWIT_Get_User_Info_Error'));
                        }
                    });
                    
                    $A.enqueueAction(action);
                }
                else {
                    this.categoryChange(component, event);
                }
            } 
            else {
                window.scrollTo(0,0);
                helper.showError(component, event, helper, $A.get('$Label.c.TWIT_Get_Metadata_Error'));
            }
        });
        
        $A.enqueueAction(action);
        
        //getIPAddress
        var IPAction = component.get('c.getIPAddress');
        IPAction.setCallback(this, function(response) {
            var state = response.getState();
            if(state === "SUCCESS") {
                var response = response.getReturnValue();
                component.set("v.IPAddress", JSON.parse(response).IP);
            } 
            else {
                window.scrollTo(0,0);
                helper.showError(component, event, helper, $A.get('$Label.c.TWIT_Get_IP_Error'));
            }
        });
        
        $A.enqueueAction(IPAction);
        
    },
    
    validateRequired : function(component, event) {
        let namecomponent = component.find("name");
        let twitchUserNamecomponent = component.find("twitchUserName");
        
        if(component.get("v.name") != '') {
            namecomponent.set("v.errors", null);
        }
        
        if(component.get("v.twitchUserName") != '') {
            twitchUserNamecomponent.set("v.errors", null);
        }
    },
    
    categoryChange : function(component, event) {
        var selCat = component.get("v.selectedCategory");
        var selSub = component.get("v.selectedSubCategory");
        var wrapper = component.get("v.webCaseWrapper");
        var amazonLoginAuthorized = component.get("v.amazonLoginAuthorized");
        var twitchLoginAuthorized = component.get("v.twitchLoginAuthorized");
        
        component.set("v.categoryArticle", null);
        component.set("v.showCategoryArticle", false);
        
        if(selCat != '') {
            let cats = wrapper.categories;
            let category;
            for(let i = 0; i < cats.length; i++) {
                if(cats[i].Category__c == selCat) {
                    category = cats[i];
                    component.set("v.selectedCategoryWrapper", category);
                    break;
                }
            }
            
            if(category.Amazon_Login_Required__c) {
                
                if(amazonLoginAuthorized || twitchLoginAuthorized) {
                    var availableSubCats = wrapper.catStrToSubCats[selCat];
                    component.set("v.subCategories", availableSubCats);
                }
                else {
                    console.log('*****amazon*****');
                    this.clearAll(component, event);
                    this.loginToAmazon(); 
                }
            }
            
            else if(category.Twitch_Login_Required__c) {
                if(amazonLoginAuthorized || twitchLoginAuthorized) {
                    var availableSubCats = wrapper.catStrToSubCats[selCat];
                    component.set("v.subCategories", availableSubCats);
                }
                else {
                    this.clearAll(component, event);
                    this.loginToPassport(component, event);
                }
            }
            
                else {
                    var availableSubCats = wrapper.catStrToSubCats[selCat];
                    if(availableSubCats) {
                        component.set("v.subCategories", availableSubCats);
                    }
                    
                    else {
                        let blank = [];
                        component.set("v.subCategories", blank);
                    }
                }
            
            if(component.get("v.subCategories").length == 0) {
                component.set("v.showSubjectAndMessage", true);
            }
            
            else {
                component.set("v.showSubjectAndMessage", false);
            }     
            
            let avail = [];
            component.set("v.detailCategories", avail);
            component.set("v.selectedDetailCategory", "");
            
            var selectedArticle = wrapper.categoryToArticle[selCat];
            if(selectedArticle) {
                var body = selectedArticle.Body__c;
                if(body) {
                    component.set("v.categoryArticle", selectedArticle);
                    component.set("v.showCategoryArticle", true);
                }
            }
            
            else {
                component.set("v.categoryArticle", null);
                component.set("v.showCategoryArticle", false);
            }
            
            component.set("v.blockCaseCreate", category.Block_Case_Create__c);
            
        }
        else {
            this.clearAll(component, event);
            component.set("v.showSubjectAndMessage", false);
            component.set("v.blockCaseCreate", true);
        }
        
    },
    
    subCategoryChange : function(component, event) {
        var selCat = component.get("v.selectedCategory");
        var selSub = component.get("v.selectedSubCategory");
        var wrapper = component.get("v.webCaseWrapper");
        var amazonLoginAuthorized = component.get("v.amazonLoginAuthorized");
        var twitchLoginAuthorized = component.get("v.twitchLoginAuthorized");
        
        component.set("v.categoryArticle", null);
        component.set("v.showCategoryArticle", false);
        component.set("v.subCategoryArticle", null);
        component.set("v.showSubCategoryArticle", false);
        
        if(selSub != '') {
            var subCats = wrapper.catStrToSubCats[selCat];
            var subCategory;
            for(var i = 0; i < subCats.length; i++) {
                if(subCats[i].Sub_Category__c == selSub) {
                    subCategory = subCats[i];
                    component.set("v.selectedSubCategoryWrapper", subCategory);
                    break;
                }
            }
            
            if(subCategory.Amazon_Login_Required__c) {
                
                if(amazonLoginAuthorized || twitchLoginAuthorized) {
                    var availableDetCats = wrapper.subCatStrToDetCats[selSub];
                    component.set("v.detailCategories", availableDetCats);
                    component.set("v.selectedDetailCategory", "");
                }
                else {
                    this.clearDetail(component, event);
                    this.loginToAmazon();
                }
            }
            
            else if(subCategory.Twitch_Login_Required__c) {
                
                if(amazonLoginAuthorized || twitchLoginAuthorized) {
                    var availableDetCats = wrapper.subCatStrToDetCats[selSub];
                    component.set("v.detailCategories", availableDetCats);
                    component.set("v.selectedDetailCategory", "");
                }
                else {
                    this.clearDetail(component, event);
                    window.location = 'https://test.salesforce.com/services/auth/sso/00D3C0000000YKmUAM/Passport?community=https://dawnbackup-help-twitch.cs60.force.com/servicecloud&startURL=/s/submit-case';
                }
            }
            
                else {
                    var availableDetCats = wrapper.subCatStrToDetCats[selSub];
                    if(availableDetCats) {
                        component.set("v.detailCategories", availableDetCats);
                        component.set("v.selectedDetailCategory", "");                        
                    }
                    else {
                        let blank = [];
                        component.set("v.detailCategories", blank);
                        component.set("v.selectedDetailCategory", "");
                    }
                    
                }
            
            
            if(component.get("v.detailCategories").length == 0) {
                component.set("v.showSubjectAndMessage", true);
            }
            else {
                component.set("v.showSubjectAndMessage", false);
            }  
            
            var selectedArticle = wrapper.subCategoryToArticle[selSub];
            if(selectedArticle) {
                var body = selectedArticle.Body__c;
                if(body) {
                    component.set("v.subCategoryArticle", selectedArticle);
                    component.set("v.showSubCategoryArticle", true);
                } 
            }
            
            else {
                component.set("v.subCategoryArticle", null);
                component.set("v.showSubCategoryArticle", false);
            }
            
            component.set("v.blockCaseCreate", subCategory.Block_Case_Create__c);
            
        }    
        else {
            this.clearDetail(component, event);
            component.set("v.showSubjectAndMessage", false);
        }
    },
    
    detailCategoryChange : function(component, event) {
        var selSub = component.get("v.selectedSubCategory");
        var selDet = component.get("v.selectedDetailCategory");
        var wrapper = component.get("v.webCaseWrapper");
        var amazonLoginAuthorized = component.get("v.amazonLoginAuthorized");
        var twitchLoginAuthorized = component.get("v.twitchLoginAuthorized");
        
        component.set("v.categoryArticle", null);
        component.set("v.showCategoryArticle", false);
        component.set("v.subCategoryArticle", null);
        component.set("v.showSubCategoryArticle", false);
        component.set("v.detailCategoryArticle", null);
        component.set("v.showDetailCategoryArticle", false);
        
        if(selDet != '') {
            var detCats = wrapper.subCatStrToDetCats[selSub];
            var detailCategory;
            for(var i = 0; i < detCats.length; i++) {
                if(detCats[i].Detail_Category__c == selDet) {
                    detailCategory = detCats[i];
                    component.set("v.selectedDetailCategoryWrapper", detailCategory);
                    break;
                }
            }
            
            if(detailCategory.Amazon_Login_Required__c && (!amazonLoginAuthorized && !twitchLoginAuthorized)) {
               this.loginToAmazon();
            }
            else if(detailCategory.Twitch_Login_Required__c && (!amazonLoginAuthorized && !twitchLoginAuthorized)) {
                this.loginToPassport(component, event);                
            }
            
            var selectedArticle = wrapper.detailCategoryToArticle[selDet];
            if(selectedArticle) {
                var body = selectedArticle.Body__c;
                if(body) {
                    component.set("v.detailCategoryArticle", selectedArticle);
                    component.set("v.showDetailCategoryArticle", true);
                }
            }
            
            else {
                component.set("v.detailCategoryArticle", null);
                component.set("v.showDetailCategoryArticle", false);
            }
            
            component.set("v.showSubjectAndMessage", true);
            component.set("v.blockCaseCreate", detailCategory.Block_Case_Create__c);
        }
        else {
            component.set("v.showSubjectAndMessage", false);
        }
    },
    
    clearAll : function(component, event) {
        var avail = [];
        component.set("v.subCategories", avail);
        component.set("v.selectedSubCategory", "");
        component.set("v.detailCategories", avail);
        component.set("v.selectedDetailCategory", "");
        component.set("v.showSubjectAndMessage", false);
        component.set("v.categoryArticle", '');
        component.set("v.subCategoryArticle", '');
        component.set("v.detailCategoryArticle", '');
        component.set("v.showCategoryArticle", false);
        component.set("v.showSubCategoryArticle", false);
        component.set("v.showDetailCategoryArticle", false);
        
    },
    
    clearDetail : function(component, event) {
        var avail = [];
        component.set("v.detailCategories", avail);
        component.set("v.selectedDetailCategory", "");
        component.set("v.detailCategoryArticle", '');
        component.set("v.showDetailCategoryArticle", false);
        component.set("v.showSubjectAndMessage", false);
    },
    
    toggleReRender : function(component, event) {
        var nameVal = component.get("v.name");
        var twitchUserNameVal = component.get("v.twitchUserName");
        var name = component.find("name");
        var twitchUserName = component.find("twitchUserName");
        
        if(nameVal) {
            $A.util.removeClass(twitchUserName, "slds-has-error");
            $A.util.addClass(twitchUserName, "hide-error-message");
        }
        if(twitchUserNameVal) {
            $A.util.removeClass(name, "slds-has-error");
            $A.util.addClass(name, "hide-error-message");
        }
    },
    
    toggleOptions : function(component, event) {
        component.set("v.categories", component.get("v.categories"));
        component.set("v.subCategories", component.get("v.subCategories"));
        component.set("v.detailCategories", component.get("v.detailCategories"));
    },
    
    hideCaseFields : function(component, event) {
        var currentContact = component.get("v.contact");
        var wrapper = component.get("v.webCaseWrapper");
        var categories = wrapper.categories;
        var subCategories = [];
        var detailCategories = [];
        
        for(var i = 0; i < categories.length; i++) {
            var category = categories[i].Category__c;
            var relatedCaseField = categories[i].Related_Case_Field__c;
            
            if(relatedCaseField) {
                if(currentContact[relatedCaseField] == false) {
                    categories[i].hide = true;
                }
                else {
                    categories[i].hide = false;
                }
            }
            
            var subCats = wrapper.catStrToSubCats[category];
            if(subCats) {
                for(var j = 0; j < subCats.length; j++) {
                    subCategories.push(subCats[j]);
                    var subCategory = subCats[j].Sub_Category__c;
                    var relatedCaseField = subCats[j].Related_Case_Field__c;
                    
                    if(relatedCaseField) {
                        if(currentContact[relatedCaseField] == false) {
                            subCats[j].hide = true;
                        }
                        else {
                            subCats[j].hide = false;
                        }
                    }
                    
                    var detCats = wrapper.subCatStrToDetCats[subCategory];
                    if(detCats) {
                        for(var k = 0; k < detCats.length; k++) {
                            detailCategories.push(detCats[k]);
                            var detailCategory = detCats[k].Detail_Category__c;
                            var relatedCaseField = detCats[k].Related_Case_Field__c;
                            
                            if(relatedCaseField) {
                                if(currentContact[relatedCaseField] == false) {
                                    detCats[k].hide = true;
                                }
                                else {
                                    detCats[k].hide = false;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        component.set("v.webCaseWrapper", wrapper);
        component.set("v.categories", categories);
    },
    
    getURLParameters : function(component, event) {
        var url_string = window.location.href;
        var url = new URL(url_string);
        
        var selectedCategory = url.searchParams.get("selectedCategory");
        if(selectedCategory) {
            component.set("v.selectedCategory", selectedCategory);
            this.categoryChange(component, event);
            
        }
        
        var selectedSubCategory = url.searchParams.get("selectedSubCategory");
        if(selectedSubCategory) {
            component.set("v.selectedSubCategory", selectedSubCategory);
            this.subCategoryChange(component, event);
            
        }
        
        var selectedDetailCategory = url.searchParams.get("selectedDetailCategory");
        if(selectedDetailCategory) {
            component.set("v.selectedDetailCategory", selectedDetailCategory);
            this.detailCategoryChange(component, event);
        }
    },
    
    onRecordSubmit : function(component, event) {
        
        var eventFields = event.getParam("fields");
        var eventFields = event.getParam("fields");
        eventFields["TwitchUserSuspended__c"] = component.get("v.twitchUserSuspended");
        var caseJSON = JSON.stringify(eventFields);
        var fileList = component.get("v.fileList"); 
        
        var action = component.get('c.createCase');
        action.setParams({
            caseJSON : caseJSON
        });
        action.setCallback(this, function(response) {
            var state = response.getState();
            if(state === "SUCCESS") {
                
                var caserecordId = response.getReturnValue();
                if(caserecordId != null) {
                    component.set("v.recordId", caserecordId);
                    if(fileList.length == 0){
                        this.onRecordSuccess(component, event); 
                    }else{
                        this.uploadHelper(component, event);
                    }
                }
            } 
            else {
                window.scrollTo(0,0);
                helper.showError(component, event, helper, $A.get('$Label.c.TWIT_Case_Submit_Error'));
            }
        });
        
        $A.enqueueAction(action);
    },
    
    onRecordSuccess : function(component, event) {
        var toastEvent = $A.get("e.force:showToast");
        toastEvent.setParams({
            title : component.get("v.successTitle"),
            message: component.get("v.successMessage"),
            type: 'Success',
            mode: 'dismissible'
        });
        toastEvent.fire();
        
        component.set("v.showForm", false);
    },
    
    loginToPassport : function(component, event) {  
        var action = component.get("c.auth_Passport");
        var selectedCategory = component.get("v.selectedCategory");
        var selectedSubCategory = component.get("v.selectedSubCategory");
        var selectedDetailCategory = component.get("v.selectedDetailCategory");
        action.setParams({
            selectedCategory : selectedCategory,
            selectedSubCategory : selectedSubCategory,
            selectedDetailCategory : selectedDetailCategory
        });
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {  
                var authURL = response.getReturnValue();
                window.location.href=response.getReturnValue();
            }
        });
        $A.enqueueAction(action);
    },
    
    loginToAmazon : function(component, event) {  
        window.location = 'https://www.amazon.com/gp/help/customer/contact-us/?ie=UTF8&initialIssue=cu-twitchprime';
    },
    
    MAX_FILE_SIZE: 4500000, //Max file size 4.5 MB 
    CHUNK_SIZE: 750000,      //Chunk Max size 750Kb 
    
    uploadHelper: function(component, event) {
        var fileInput = component.get("v.fileList");
        // get the first file using array index[0] 
        for (var i = 0; i < fileInput.length; i++) {
            this.readFile(component,fileInput[i]);
        }
    },
    
    readFile: function(component,file) {
        console.log('***file**',file); 
        var objFileReader = new FileReader();
        var self = this;
        objFileReader.onload = $A.getCallback(function() {
            var fileContents = objFileReader.result;
            var base64 = 'base64,';
            var dataStart = fileContents.indexOf(base64) + base64.length;
            
            fileContents = fileContents.substring(dataStart);
            // call the uploadProcess method 
            self.uploadProcess(component, file, fileContents);
        });
        objFileReader.readAsDataURL(file);
    },
    
    uploadProcess: function(component, file, fileContents) {
        // set a default size or startpostiton as 0 
        var startPosition = 0;
        // calculate the end size or endPostion using Math.min() function which is return the min. value   
        var endPosition = Math.min(fileContents.length, startPosition + this.CHUNK_SIZE);
        
        // start with the initial chunk, and set the attachId(last parameter)is null in begin
        this.uploadInChunk(component, file, fileContents, startPosition, endPosition, '');
    },
    
    
    uploadInChunk: function(component, file, fileContents, startPosition, endPosition, attachId) {
        // call the apex method 'saveChunk'
        var getchunk = fileContents.substring(startPosition, endPosition);
        var action = component.get("c.saveChunk");
        action.setParams({
            parentId: component.get("v.recordId"),
            fileName: file.name,
            base64Data: encodeURIComponent(getchunk),
            contentType: file.type,
            fileId: attachId
        });
        
        // set call back 
        action.setCallback(this, function(response) {
            // store the response / Attachment Id   
            attachId = response.getReturnValue();
            var state = response.getState();
            if (state === "SUCCESS") {
                // update the start position with end postion
                startPosition = endPosition;
                endPosition = Math.min(fileContents.length, startPosition + this.CHUNK_SIZE);
                // check if the start postion is still less then end postion 
                // then call again 'uploadInChunk' method , 
                // else, diaply alert msg and hide the loading spinner
                if (startPosition < endPosition) {
                    this.uploadInChunk(component, file, fileContents, startPosition, endPosition, attachId);
                } else {
                    //alert('your File is uploaded successfully');
                    //component.set("v.showLoadingSpinner", false);
                    this.onRecordSuccess(component, event);
                }
                // handel the response errors        
            }
            else {
                window.scrollTo(0,0);
                helper.showError(component, event, helper, $A.get('$Label.c.TWIT_Upload_File_Error'));
            }
        });
        // enqueue the action
        $A.enqueueAction(action);
    },
    
    getBrowserInformation: function(component, event) {
        navigator.sayswho= (function(){
            var ua= navigator.userAgent, tem, 
                M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
            if(/trident/i.test(M[1])){
                tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
                return 'IE '+(tem[1] || '');
            }
            if(M[1]=== 'Chrome'){
                tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
                if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
            }
            M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
            if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
            return M.join(' ');
        })();
        
        component.set("v.browserInfo", navigator.sayswho);
    },
    
    setCaptchaListener: function(component, event) {
        let vfOrigin = "https://twitcheng--dawnbackup--c.cs60.visual.force.com/apex/TWIT_Captcha";
        window.addEventListener("message", function(event) {
            if (event.data==="Unlock"){            	
                let myButton = component.find("myButton");
                myButton.set('v.disabled', false);
            }            
        }, false); 
    },
    
    handleUploadFinished: function(component, event) {
        var uploadedFileList = event.getSource().get("v.files");
        var existingFileList = component.get("v.fileList");        
        var fileList = [];
        
        for (var i = 0; i < existingFileList.length; i++) {
            fileList.push(existingFileList[i]);
        }
        for (var i = 0; i < uploadedFileList.length; i++) {
            fileList.push(uploadedFileList[i]);
        } 
        component.set("v.fileList", fileList);  
    },
    
    fireItemsChangeEvent: function(component, event) {
        var appEvent = $A.get("e.selfService:caseCreateFieldChange");
        appEvent.setParams({
            "modifiedField": event.getSource().get("v.fieldName"),
            "modifiedFieldValue": event.getSource().get("v.value")
        });
        appEvent.fire();
    },
    
    showError : function(component, event, helper, message) {
        var throwToastAction = $A.get('e.force:showToast');
        throwToastAction.setParams({
            'message': message,
            'type': 'error'
        });
        throwToastAction.fire();
    }
})
