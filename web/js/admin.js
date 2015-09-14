
App.prototype.brand = function(){
  var html = "This product is a trademark of Quest Pico at <a href='http://www.questpico.com'>www.questpico.com</a><br/>Talk to us today at <a href='mailto:info@questpico.com'>info@questpico.com</a>";
  app.ui.modal(html,"About",{
      cancelText : "Done"
  });  
};


App.prototype.saveSettings = function () {
    var data = app.getFormData(app.context.settings);
    if (!data) return;
    var request = {};
    $.each(app.settings, function (key) {
        request[key] = data[key].value;
    });
    app.xhr({
        data : request,
        service : "open_data_service",
        message : "save_settings",
        load: false,
        success: function (resp) {
            var r = resp.response.data;
            if (r === "success") {
                alert("Settings saved successfully");
            }
            else if (r === "fail") {
                alert(resp.response.reason);
            }
        }
    });
};


App.prototype.loadSettings = function () {
    app.paginate({
        title: "Settings",
        save_state: true,
        save_state_area: "content_area",
        onload_handler: app.pages.business,
        onload: function () {
            $("#paginate_print").remove();
            app.context.settings.fields = app.settings;
            var settingsArea = $("<div id='settings_area'>");
            $("#paginate_body").append(settingsArea);
            //render settings from app.settings
            $.each(app.settings, function (setting) {
                app.renderDom(app.settings[setting], settingsArea);
            });
            app.xhr({
                data : {},
                service : "open_data_service",
                message : "fetch_settings",
                load: false,
                cache : true,
                success: function (resp) {
                    var r = resp.response.data;
                    if(!r.CONF_KEY) return;
                    $.each(r.CONF_KEY, function (x) {
                        $("#" + r.CONF_KEY[x]).val(r.CONF_VALUE[x]);
                    });
                }
            });
        }
    });
};





App.prototype.updateUser = function () {
    var data = app.getFormData(app.context.user);
    if (!data)
        return;
    var role = data.user_role.value;
    var priv;
    if(role === "admin"){
        priv = ["pos_admin_service", "user_service"];
    }
    else if(role === "intermediate"){
        priv = ["pos_middle_service"];
    }
    else if(role === "seller"){
        priv = ["pos_sale_service"];
    }
    var requestData = {
        user_name: data.email_address.value,
        host: "localhost",
        group: role,
        privs: priv
    };
    app.xhr({
        data : requestData,
        service : "user_service",
        message : "edit_user",
        load: true,
        success: function (data) {
            //say the user was created
            if (data.response.data === "success") {
                app.showMessage(app.context.update_user);
            }
            else if (data.response.data === "fail") {
                app.showMessage(data.response.reason);
            }
            else if (data.response.type === "exception") {
                app.showMessage(data.response.ex_reason);
            }
        },
    });
};

App.prototype.generalUserRequest = function (msg) {
    var data = app.getFormData(app.context.user);
    if (!data) return;
    var successMsg,confirmMsg;
    if(msg === "delete_user"){
        successMsg = app.context.delete_user;
        confirmMsg = app.context.delete_user_confirm;
    }
    else if(msg === "disable_user"){
        successMsg = app.context.disable_user;
        confirmMsg = app.context.disable_user_confirm; 
    }
    else if(msg === "enable_user"){
        successMsg = app.context.enable_user;
        confirmMsg = app.context.enable_user_confirm; 
    }
    var conf = confirm(confirmMsg);
    if(!conf) return;
    var requestData = {
        name: data.email_address.value
    };
    app.xhr( {
        data : requestData,
        service : "user_service",
        message : msg,
        load: true,
        success: function (data) {
            if (data.response.data === "success") {
                app.showMessage(successMsg);
            }
            else if (data.response.type === "exception") {
                app.showMessage(data.response.ex_reason);
            }
            else if (data.response.data === "fail") {
                app.showMessage(data.response.reason);
            }
            //save the local data
        }
    });
};





App.prototype.createUser = function () {
    var data = app.getFormData(app.context.user);
    if (!data)
        return;
    var role = data.user_role.value;
    var priv = role === "admin" ? ["pos_admin_service", "user_service"] : ["pos_sale_service"];
    var reg = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    var emailValid = reg.test(data.email_address.value);
    if (!emailValid) {
        app.showMessage(app.context.email_invalid);
        $("#email_address").focus();
        return;
    }
    var requestData = {
        name: data.email_address.value,
        host: app.appData.formData.login.current_user.host,
        group: role,
        privs: priv,
        real_name: data.real_name.value
    };
    app.xhr({
        data : requestData,
        service : "open_data_service",
        message : "create_account",
        load: true,
        success: function (data) {
            if (data.response.data === "success") {
                app.showMessage(app.context.create_user, "green");
            }
            else if (data.response.data === "fail") {
                app.showMessage(data.response.reason);
            }
            else if (data.response.type === "exception") {
                app.showMessage(data.response.ex_reason);
            }
            //save the local data
        }
    });
};

App.prototype.forgotPassword = function () {
    app.context = app.appData.formData.login;
    app.context.load_area = "error_forgot";
    var html = "<label>Enter your account email address to recover your password</label><br/>\n\
                <label id='error_forgot' class='error'></label><br/>\n\
                <label>Email Address</label>\n\
                <input type='email' id='registered_email' class='form-control' placeholder='Email Address'>\n\
                <label>Business Name</label>\n\
                <input type='text' id='business_name' class='form-control' placeholder='Business Name'>";
    var m = app.ui.modal(html, "Forgot Password", {
        ok: function () {
            var email = $("#registered_email").val();
            var business = $("#business_name").val();
            if (email === "" || business === "") {
                $("#error_forgot").html(app.context.businesss_required);
                return;
            }
            var request = {
                username: email,
                business_name: business
            };
            app.xhr({
                data : request,
                service : "open_data_service",
                message : "forgot_password",
                load: true,
                success: function (data) {
                    //say the user was created
                    if (data.response.data === "success") {
                        $("#error_forgot").html(app.context.password_reset_success);
                        app.runLater(4000, function () {
                            m.modal('hide');
                        });
                    }
                    else if (data.response.data === "fail") {
                        $("#error_forgot").html(data.response.reason);
                    }
                    else if (data.response.type === "exception") {
                        $("#error_forgot").html(data.response.ex_reason);
                    }
                },
                error: function () {
                    //do something 
                    app.showMessage(app.context.error_message);
                }
            });

        },
        cancel: function () {

        },
        okText: "Recover Password",
        cancelText: "Cancel"
    });
};


App.prototype.resetPassword = function () {
    var data = app.getFormData(app.context.user);
    if (!data)
        return;
    var requestData = {
        name: data.email_address.value
    };
    app.xhr({
        data : requestData,
        service : "user_service",
        message : "reset_pass",
        load: true,
        success: function (data) {
            if (data.response.data === "success") {
                app.showMessage(app.context.reset_password);
            }
            else if (data.response.data === "fail") {
                app.showMessage(data.response.reason);
            }
            else if (data.response.type === "exception") {
                app.showMessage(data.response.ex_reason);
            }
        }
    });
};

App.prototype.allUsers = function () {
    app.xhr({
        data : {},
        service : "user_service,pos_admin_service",
        message : "all_users,all_users",
        load: true,
        success: function (data) {
            var title = "All Users";
            var names = data.response.pos_admin_service_all_users.data.USER_NAME;
            var userData = data.response.user_service_all_users.data;
            var privs = [];
            var created = [];
            $.each(names,function(index){
                var name = names[index];
                var x = userData.USER_NAME.indexOf(name);
                var priv;
                if (userData.privileges[x].indexOf("pos_admin_service") > -1) {
                    priv = "Admin";
                }
                else if (userData.privileges[x].indexOf("pos_sale_service") > -1) {
                    priv = "Seller";
                }
                else if (userData.privileges[x].indexOf("pos_middle_service") > -1) {
                    priv = "Intermediate";
                }
                privs[index] = priv;
                created[index] = new Date(userData.CREATED[x]).toLocaleDateString();
                
            });
            

            app.paginate({
                title: title,
                save_state: true,
                save_state_area: "content_area",
                onload_handler: app.pages.users,
                onload: function () {
                     app.ui.table({
                        id_to_append : "paginate_body",
                        headers :  ["Email Address", "User Role", "Date Created"],
                        values :  [names, privs,created],
                        include_nums : true,
                        style : "",
                        mobile_collapse : true
                    });
                }
            });
        }
    });
};



App.prototype.addResource = function () {
    var data = app.getFormData(app.context.expense);
    if (!data) return;
    var request = {
        resource_type: data.resource_type.value,
        resource_name: data.expense_name.value,
        resource_amount: data.expense_amount.value
    };
    var conf = confirm("Add "+data.resource_type.value+" ?");
    if(!conf) return;
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "add_resource",
        load: true,
        success: function (resp) {
            if (resp.response.data === "success") {
                app.showMessage(app.context.resource_success.replace("{resource_type}", data.resource_type.value));
            }
            else if (resp.response.data === "fail") {
                app.showMessage(data.response.reason);
            }

        }
    });

};



App.prototype.profitAndLoss = function () {
    var data = app.getFormData(app.context.profit_and_loss);
    if (!data)
        return;
    var request = {
        start_date: data.start_date.value,
        end_date: data.end_date.value,
        business_type : localStorage.getItem("business_type")
    };
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "profit_and_loss",
        load: true,
        success: function (resp) {
            var pandl = resp.response.data;
            app.paginate({
                save_state: true,
                save_state_area: "content_area",
                title: "Profit And Loss between " + data.start_date.value + " and " + data.end_date.value + " ",
                onload_handler: app.pages.expenses,
                onload: function () {
                    var items = ["<b>Cost of Sales</b>", "<b>Opening Stock</b>", "<b>Purchases</b>",
                        "<b>Less Closing Stock</b>", "<b>Cost of Goods sold</b>", "<b>Gross Profit</b>", "<b>Expenses</b>"];
                    var types = [1, 0, 0, 0, 0, 1, ""];
                    var costOfGoodsSold = pandl.opening_stock + pandl.cost_of_goods_bought_bp - pandl.closing_stock;
                    var grossProfit = pandl.cost_of_goods_sold_sp - costOfGoodsSold;
                    var values = [pandl.cost_of_goods_sold_sp, pandl.opening_stock, pandl.cost_of_goods_bought_bp, pandl.closing_stock, costOfGoodsSold, grossProfit, ""];
                    var debits = [];
                    var credits = [];
                    var totalExpenses = 0;
                    var totalIncomes = 0;
                    $.each(pandl.resource_data.RESOURCE_TYPE, function (index) {
                        var type = pandl.resource_data.RESOURCE_TYPE[index];
                        if (type === "expense") {
                            var rName = pandl.resource_data.RESOURCE_NAME[index];
                            var rAmount = parseFloat(pandl.resource_data.RESOURCE_AMOUNT[index]);
                            var index = items.indexOf(rName);
                            if(index > -1){
                               values[index] = values[index] + rAmount;
                            }
                            else {
                                items.push(rName);
                                values.push(rAmount);
                                types.push(0);
                            }
                            totalExpenses += rAmount;
                        }
                    });

                    items.push("<b>Incomes</b>");
                    types.push("");
                    values.push("");
                    $.each(pandl.resource_data.RESOURCE_TYPE, function (index) {
                        var type = pandl.resource_data.RESOURCE_TYPE[index];
                        if (type === "income") {
                            var rName = pandl.resource_data.RESOURCE_NAME[index];
                            var rAmount = parseFloat(pandl.resource_data.RESOURCE_AMOUNT[index]);
                            var index = items.indexOf(rName);
                            if(index > -1){
                               values[index] = values[index] + rAmount;
                            }
                            else {
                                items.push(rName);
                                values.push(rAmount);
                                types.push(1);
                            }
                            totalIncomes += rAmount;
                        }
                    });

                    var netProfit = grossProfit + totalIncomes - totalExpenses;
                    items.push("<b>Net Profit</b>");
                    types.push(1);
                    values.push(netProfit);
                    $.each(items, function (index) {
                        if (types[index] === 1) {
                            //this is a credit
                            credits.push(app.formatMoney(values[index]));
                            debits.push("");
                        }
                        else if (types[index] === 0) {
                            debits.push(app.formatMoney(values[index]));
                            credits.push("");
                        }
                        else {
                            credits.push("");
                            debits.push("");
                        }
                    });
                   
                      app.ui.table({
                        id_to_append : "paginate_body",
                        headers :  ["Items", "Expenses", "Revenues"],
                        values :  [items, debits, credits],
                        include_nums : false,
                        style : ""
                    });
                }
            });

            //cost of sales : 100000 
            //opening stock : 10000
            //purchases :    30000
            //closing stock : 10000
            //cost of goods sold : 30000
            //gross profit :    70000
            //expenses : 
            //  rent :  3000
            //  elect : 4000
            //incomes : 
            //  stuff :      2000
            //  more stuff : 3000
            //net profit : 52000
            //
        }
    });



};

App.prototype.supplierSelect = function(){
    var prodId = $("#search_products").attr("current-item");
    var name = $("#product_name").val();
    if(!prodId){
        app.showMessage(app.context.no_product_selected);
        return;
    }
    app.paginate({
        title: "Select Suppliers for "+name,
        save_state: true,
        save_state_area: "content_area",
        onload_handler: app.pages.products,
        onload: function () {
            $("#paginate_print").remove(); //remove the print button
            app.loadPage({
                load_url: app.pages.supplier_select,
                load_area: "paginate_body",
                onload: function () {
                   //fetch the suppliers this product has
                    //setup click handlers
                    $("#supplier_add_btn").click(function(){
                        app.supplierAndProduct("create",prodId);
                    });
                    app.supplierAndProduct("fetch_all",prodId);
                }
            });
        }
    });
};




App.prototype.supplierAndProduct = function(actionType,prodId,supId){
    if(actionType === "create"){
        supId = $("#search_suppliers").attr("current-item");
        if(!supId) {
            app.showMessage(app.context.no_supplier_selected);
            return;
        }
    }
    else if(actionType === "delete"){
        var conf = confirm("Remove supplier ?");
        if(!conf) return;
    }

    var request = {
        action_type : actionType,
        supplier_id : supId,
        product_id : prodId
    };
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "supplier_and_product",
        load : true,
        success : function(data){
            var resp = data.response.data;
            if(actionType === "create" && resp === "success"){
                app.showMessage(app.context.supplier_added);
                app.supplierAndProduct("fetch_all",prodId);
            }
            else if(actionType === "delete" && resp === "success"){
                app.showMessage(app.context.supplier_deleted);
                app.supplierAndProduct("fetch_all",prodId);
            }
            else if(actionType === "fetch_all"){
                $("#supplier_area").html("<h4>Current Suppliers</h4>");
                var ID = $.extend(true, [], resp.SUPPLIER_ID);
                app.ui.table({
                    id_to_append : "supplier_area",
                    headers :  ["Name","Account","Remove"],
                    values :  [resp.SUPPLIER_NAME,resp.SUPPLIER_ID, ID],
                    include_nums : true,
                    style : "",
                    mobile_collapse : true,
                    transform : {
                        1 : function(supId,index){
                            var name = encodeURIComponent(resp.SUPPLIER_NAME[index]);
                            return "<a href='#' onclick=app.supplierAccount('"+prodId+"','"+supId+"','"+name+"')>Account</a>";
                        },
                        2 : function(value){
                            return "<a href='#' onclick=app.supplierAndProduct('delete','"+prodId+"','"+value+"')>Remove</a>";
                        }
                    }
                });
            }
            else {
                app.showMessage(data.response.reason);
            }
        }
    });
};


App.prototype.supplierAccount = function(prodId,supId,name){
    name = decodeURIComponent(name);
    app.ui.modal("","Supplier Account",{
        okText : "Proceed",
        ok : function(){
            var data = app.getFormData(app.context.supplier_account);
            if(!data) return;
            var request = {
                entry_type : data.entry_type.value,
                amount : data.amount.value,
                narration : data.narration.value,
                units_received : data.units_received.value,
                sp_per_unit : data.sp_per_unit.value,
                supplier_id : supId,
                product_id : prodId,
                business_type : localStorage.getItem("business_type")
            };
            app.xhr({
                data : request,
                service : app.dominant_privilege,
                message : "supplier_account_transact",
                load : true,
                success : function (data) {
                    var resp = data.response.data;
                    if(resp === "success"){
                        app.showMessage(app.context.supplier_transact);
                    }
                    else if(resp === "fail"){
                        app.showMessage(data.response.reason);
                    }
                }
            });
        }
    });
    app.loadPage({
        load_url: app.pages.supplier_account,
        load_area: "modal_content_area",
        onload : function(){
            $("#supplier_account_name").html(name);
            if(localStorage.getItem("business_type") === "services"){
                $("#units_received").val("0");
                $("#sp_per_unit").val("0");
                $("#units_received").css("display","none");
                $("#sp_per_unit").css("display","none");
                $("#units_received_lbl").css("display","none");
                $("#sp_per_unit_lbl").css("display","none");
            }
        }
    });
};


App.prototype.allSuppliers = function(){
    app.xhr({
        data : {},
        service : app.dominant_privilege,
        message : "all_suppliers",
        load : true,
        success : function(data){
            var r = data.response.data;
            app.paginate({
                save_state : true,
                save_state_area : "content_area",
                title : "Suppliers",
                onload_handler : app.pages.suppliers,
                onload : function(){
                    app.ui.table({
                        id_to_append : "paginate_body",
                        headers :  ["Name","Phone","Email","Address","Website","Contact Name","Contact Phone","City","Country"],
                        values :  [r.SUPPLIER_NAME, r.PHONE_NUMBER, r.EMAIL_ADDRESS, r.POSTAL_ADDRESS, r.WEBSITE,
                            r.CONTACT_PERSON_NAME, r.CONTACT_PERSON_PHONE, r.CITY, r.COUNTRY],
                        include_nums : true,
                        style : "",
                        mobile_collapse : true
                    });
                }
            });
        }
    });
};


App.prototype.gridEdit = function(ids,columns,headers,values){
    headers.shift(); //remove the No header
    $("#paginate_body").html("");//empty the area
    app.newGrid({
        id : "paginate_body",
        col_names : headers,
        load_column_by_column : true, 
        init_data : values,
        disabled : [0,7,8],
        col_types: function () {
            var types = [];
            $.each(headers, function (index) {
                var width = 100;
                width = headers[index] === "Product Name" ? 200 : width;
                types.push({
                    type: 'text',
                    width: width
                });
            });
            return types;
        },
        onEdit : function(row,col,oldValue,newValue){
           //do a delayed save
           app.runLater(1000,function(){
               var request = {
                   id : ids[row],
                   old_value : oldValue,
                   new_value : newValue,
                   column : columns[col],
                   business_type : localStorage.getItem("business_type")
               };
               app.xhr({
                   data : request,
                   service : app.dominant_privilege,
                   message : "save_grid_edit",
                   load : false,
                   success : function(resp){
                       if(resp.response.data === "success"){
                          $("#paginate_edit_icon").css("background","lightgreen");
                          app.runLater(2000,function(){
                              $("#paginate_edit_icon").css("background","lightblue"); 
                          });
                       }
                   }
               });
           });
        }
    });
};

App.prototype.allProducts = function (handler) {
    var request = {
        category : $("#product_categories").val()
    };
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "all_products",
        load: true,
        cache : true,
        success: function (data) {
            var resp = data.response.data;
            app.context.product.fields.search_products.autocomplete.data = $.extend(true, {}, resp); //we will need this for paginateSelect
            var title = "All Products";
            app.paginate({
                save_state: true,
                save_state_area: "content_area",
                title: title,
                onload_handler: handler,
                onload: function () {
                    var bType = app.appData.formData.login.current_user.business_type;
                    var headers, values,columns;
                    $.each(resp.PRODUCT_NAME, function (index) {
                        resp.CREATED[index] = new Date(parseInt(resp.CREATED[index])).toLocaleDateString();
                        resp.PRODUCT_EXPIRY_DATE[index] = new Date(parseInt(resp.PRODUCT_EXPIRY_DATE[index])).toLocaleDateString();
                        resp.BP_UNIT_COST[index] = app.formatMoney(resp.BP_UNIT_COST[index]);
                        resp.SP_UNIT_COST[index] = app.formatMoney(resp.SP_UNIT_COST[index]);
                    });
                    
                    if (bType === "goods") {
                        headers = ["Product Name", "Category","S/Category", "BP/Unit", "SP/Unit", "Available Qty", "Reminder Limit", "Date Created", "Expiry Date"];
                        values = [resp.PRODUCT_NAME, resp.PRODUCT_CATEGORY,resp.PRODUCT_SUB_CATEGORY, resp.BP_UNIT_COST, resp.SP_UNIT_COST, resp.PRODUCT_QTY,
                            resp.PRODUCT_REMIND_LIMIT, resp.CREATED, resp.PRODUCT_EXPIRY_DATE];
                        columns = ["PRODUCT_NAME", "PRODUCT_CATEGORY","PRODUCT_SUB_CATEGORY", "BP_UNIT_COST", "SP_UNIT_COST","PRODUCT_QTY",
                            "PRODUCT_REMIND_LIMIT", "CREATED","PRODUCT_EXPIRY_DATE"];
                        
                    }
                    else if (bType === "services") {
                        if (app.getSetting("track_stock") === "1") {
                            headers = ["Product Name", "Category","S/Category", "SP/Unit","Available Qty", "Date Created"];
                            values = [resp.PRODUCT_NAME, resp.PRODUCT_CATEGORY,resp.PRODUCT_SUB_CATEGORY, resp.SP_UNIT_COST, 
                                resp.PRODUCT_QTY, resp.CREATED];
                            columns = ["PRODUCT_NAME", "PRODUCT_CATEGORY","PRODUCT_SUB_CATEGORY", "SP_UNIT_COST", 
                                "PRODUCT_QTY","CREATED"];
                            
                        }
                        else {
                            headers = ["Product Name", "Category","S/Category" ,"SP/Unit", "Date Created"];
                            values = [resp.PRODUCT_NAME, resp.PRODUCT_CATEGORY,resp.PRODUCT_SUB_CATEGORY, resp.SP_UNIT_COST, resp.CREATED];
                            columns = ["PRODUCT_NAME", "PRODUCT_CATEGORY","PRODUCT_SUB_CATEGORY", "SP_UNIT_COST", "CREATED"];
                        }
                    }
                     app.ui.table({
                        id_to_append : "paginate_body",
                        headers :  headers,
                        values :  values,
                        include_nums : true,
                        style : "",
                        mobile_collapse : true,
                        transform : {
                            0: function(value,index){
                                return "<a href='#' id=item_select_" + index + ">" + value + "</a>";
                            }
                        }
                    });
                    $.each(resp.PRODUCT_NAME, function (index) {
                        //set up onclick handlers
                        $("#item_select_" + index).click(function () {
                            var defaultHandler = handler === app.pages.sale ? undefined : app.context.product.fields.search_products.autocomplete_handler;
                            var afterSelectItem = handler === app.pages.sale ? app.sale : function(data,index){
                                $("#search_products").attr("current-item",data.ID[index]);
                                $("#search_products").val(data.PRODUCT_NAME[index]);
                                $("#product_name").attr("old-product-name",data.PRODUCT_NAME[index]);
                            };
                            app.paginateSelectItem({
                                data: app.context.product.fields.search_products.autocomplete.data,
                                index: index,
                                handler: defaultHandler,
                                afterSelectItem: afterSelectItem
                            });
                        });
                    });
                    
                    //add an edit button for the admin
                    if (app.dominant_privilege === "pos_admin_service") {
                        var img = $("<img src='img/edit.png' title='Edit' class='paginate_round_icon' id='paginate_edit_icon'>");
                        img.click(function () {
                            //launch the edit grid 
                            app.gridEdit(resp.ID,columns,headers,values);
                        });
                        $("#paginate_button_area").append(img);
                    }
                }
            });
        }
    });
};


App.prototype.goodsStockHistory = function () {
    var data = app.getFormData(app.context.reports);
    var id = $("#search_products").attr("current-item");
    id = $("#search_products").val().trim() === ""  ? "all" : id;
    if (!data)
        return;
    if (Date.parse(data.end_date.value) < Date.parse(data.start_date.value)) {
        app.showMessage(app.context.invalid_dates);
        return;
    }
    var request = {
        id: id,
        user_name: $("#stock_select_users").val(),
        begin_date: data.start_date.value+" "+$("#start_time").val()+":00",
        end_date: data.end_date.value+" "+$("#stop_time").val()+":59",
        report_type : data.report_type.value,
        product_categories : data.product_categories.value
    };
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "stock_history",
        load: true,
        success: function (data) {
            //product name
            var resp = data.response.data;
            //name,username,narr,time,type
            app.paginate({
                title: "Stock History",
                save_state: true,
                save_state_area: "content_area",
                onload_handler: app.pages.reports,
                onload: function () {
                    var totalQty = 0;
                    var totalSP = 0;
                    var totalBP = 0;
                    var profits = 0;
                    var costOfSales = 0;
                    var costOfGoods = 0;
                    var undos = [];
                    $.each(resp.TRAN_TYPE, function (index) {
                        var type = resp.TRAN_TYPE[index];
                        var flag = resp.TRAN_FLAG[index];
                        var color;
                        if(flag === "sale_to_customer"){
                            color = "red";
                        }
                        else if(flag === "stock_in"){
                            color = "green";
                        }
                        else if(flag === "stock_out"){
                            color = "orange";
                        }

                        var qty = type === "1" ? parseFloat(resp.STOCK_QTY[index]) : -parseFloat(resp.STOCK_QTY[index]);
                        var amountSP = type === "1" ? parseFloat(resp.STOCK_COST_SP[index]) : -parseFloat(resp.STOCK_COST_SP[index]);
                        var amountBP = type === "1" ? parseFloat(resp.STOCK_COST_BP[index]) : -parseFloat(resp.STOCK_COST_BP[index]);
                        var profit = parseFloat(resp.PROFIT[index]);

                       
                        var span = type === "0" ? "Stock Decrease" : "Stock Increase";
                        resp.TRAN_TYPE[index] = "<span style='color : " + color + "'>" + span + "<span>";

                        var undo = "<a href='#' onclick='app.undoSale(\"" + resp.PRODUCT_ID[index] + "\",\"" + resp.STOCK_QTY[index] + "\")' \n\
                                    title='Undo sale'>Undo Sale</a>";

                        flag === "sale_to_customer" ? undos.push(undo) : undos.push("");

                        var time = new Date(parseInt(resp.CREATED[index])).toLocaleString();
                        resp.CREATED[index] = time;

                        resp.STOCK_QTY[index] = "<span style='color :" + color + "'>" + resp.STOCK_QTY[index] + "</span>";
                        resp.STOCK_COST_SP[index] = "<span style='color :" + color + "'>" + app.formatMoney(resp.STOCK_COST_SP[index]) + "</span>";
                        resp.STOCK_COST_BP[index] = "<span style='color :" + color + "'>" + app.formatMoney(resp.STOCK_COST_BP[index]) + "</span>";
                        resp.PROFIT[index] = app.formatMoney(resp.PROFIT[index]);

                        totalQty = totalQty + qty;
                        totalSP = totalSP + amountSP;
                        totalBP = totalBP + amountBP;
                        profits = profits + profit;
                        flag === "sale_to_customer" ? costOfSales = costOfSales - amountSP : 0;
                        flag === "sale_to_customer" ? costOfGoods = costOfGoods - amountBP : 0;
                    });
                    resp.STOCK_COST_BP.push("<b>" + app.formatMoney(totalBP) + "</b>");
                    resp.STOCK_COST_SP.push("<b>" + app.formatMoney(totalSP) + "</b>");
                    resp.STOCK_QTY.push("<b>" + totalQty + "</b>");
                    resp.PROFIT.push("<b>" + app.formatMoney(profits) + "</b>");
                    resp.PRODUCT_NAME.push("<b>Totals</b>");
                    resp.NARRATION.push(undefined);
                    resp.CREATED.push(undefined);
                    app.ui.table({
                        id_to_append : "paginate_body",
                        headers :  ["Product Name", "Stock Value/BP", "Stock Value/SP ", "Stock Qty", "Profit", "Entry Type", "Narration", "Entry Date", "Undo Sale"],
                        values :  [resp.PRODUCT_NAME, resp.STOCK_COST_BP, resp.STOCK_COST_SP, resp.STOCK_QTY, resp.PROFIT, resp.TRAN_TYPE, resp.NARRATION, resp.CREATED, undos],
                        include_nums : true,
                        style : "",
                        mobile_collapse : true,
                        summarize : {
                            cols : [6],
                            lengths : [30]
                        }
                    });
                    var summary = $("<table class='summary table'><tr>"+
                                    "<tr><th>Cost Of Goods</th><th>Cost Of Sales</th><th>Profit</th></tr>"+
                                    "<tr><td>"+app.formatMoney(costOfGoods) + "</td>"+
                                    "<td>" + app.formatMoney(costOfSales) + "</td>"+
                                    "<td>" + app.formatMoney(profits) + "</td></tr></table>");
                    $("#paginate_body").append(summary);
                }
            });

        }
    });
};

App.prototype.servicesStockHistory = function () {
    var data = app.getFormData(app.context.reports);
    var id = $("#search_products").attr("current-item");
    id = $("#search_products").val().trim() === ""  ? "all" : id;
    if (!data)
        return;
    if (Date.parse(data.end_date.value) < Date.parse(data.start_date.value)) {
        app.showMessage(app.context.invalid_dates);
        return;
    }
    var request = {
        id: id,
        user_name: $("#stock_select_users").val(),
        begin_date: data.start_date.value+" "+$("#start_time").val()+":00",
        end_date: data.end_date.value+" "+$("#stop_time").val()+":59",
        report_type : data.report_type.value,
        product_categories : data.product_categories.value
    };
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "stock_history",
        load: true,
        success: function (data) {
            //product name
            var resp = data.response.data;
            //name,username,narr,time,type
            app.paginate({
                title: "Stock History",
                save_state: true,
                save_state_area: "content_area",
                onload_handler: app.pages.reports,
                onload: function () {
                    var totalQty = 0;
                    var totalSP = 0;
                    var costOfSales = 0;
                    var undos = [];
                    $.each(resp.TRAN_TYPE, function (index) {
                        var type = resp.TRAN_TYPE[index];
                        var flag = resp.TRAN_FLAG[index];
                        var color;
                        if(flag === "sale_to_customer"){
                            color = "red";
                        }
                        else if(flag === "stock_in"){
                            color = "green";
                        }
                        else if(flag === "stock_out"){
                            color = "orange";
                        }

                        var qty = type === "1" ? parseFloat(resp.STOCK_QTY[index]) : -parseFloat(resp.STOCK_QTY[index]);
                        var amountSP = type === "1" ? parseFloat(resp.STOCK_COST_SP[index]) : -parseFloat(resp.STOCK_COST_SP[index]);
                       
                        var span = type === "0" ? "Stock Decrease" : "Stock Increase";
                        resp.TRAN_TYPE[index] = "<span style='color : " + color + "'>" + span + "<span>";

                        var undo = "<a href='#' onclick='app.undoSale(\"" + resp.PRODUCT_ID[index] + "\",\"" + resp.STOCK_QTY[index] + "\")' \n\
                                    title='Undo sale'>Undo Sale</a>";

                        type === "0" ? undos.push(undo) : undos.push("");

                        var time = new Date(parseInt(resp.CREATED[index])).toLocaleString();
                        resp.CREATED[index] = time;

                        resp.STOCK_QTY[index] = "<span style='color :" + color + "'>" + resp.STOCK_QTY[index] + "</span>";
                        resp.STOCK_COST_SP[index] = "<span style='color :" + color + "'>" + app.formatMoney(resp.STOCK_COST_SP[index]) + "</span>";

                        totalQty = totalQty + qty;
                        totalSP = totalSP + amountSP;
                       
                        flag === "sale_to_customer" ? costOfSales = costOfSales - amountSP : 0;
                    });

                    resp.STOCK_COST_SP.push("<b>" + app.formatMoney(totalSP) + "</b>");
                    resp.STOCK_QTY.push("<b>" + totalQty + "</b>");
                    resp.PRODUCT_NAME.push("<b>Totals</b>");
                    resp.NARRATION.push(undefined);
                    resp.CREATED.push(undefined);
                    app.ui.table({
                        id_to_append : "paginate_body",
                        headers : ["Product Name", "Cost ", "Qty", "Entry Type", "Narration", "Entry Date", "Undo Sale"],
                        values :   [resp.PRODUCT_NAME, resp.STOCK_COST_SP, resp.STOCK_QTY, resp.TRAN_TYPE, resp.NARRATION, resp.CREATED, undos],
                        include_nums : true,
                        style : "",
                        mobile_collapse : true,
                        summarize : {
                            cols : [4],
                            lengths : [30]
                        }
                    });
                    var summary = $("<div class='summary'><span>Cost Of Sales: " + app.formatMoney(costOfSales) + "</span></div>");
                    $("#paginate_body").append(summary);
                }
            });

        }
    });
};


App.prototype.stockHistory = function () {
    var type = $("#report_type").val();
    if(type === "stock_history") {
        var trackStock = app.getSetting("track_stock");
        trackStock = localStorage.getItem("business_type") === "goods" ? "1" : "0";
        trackStock === "1" ? app.goodsStockHistory() : app.servicesStockHistory();
    }
    else if(type === "commission_history"){
        app.reportHistory({
            success : function(data){
               var resp = data.response.data;
                app.paginate({
                    title: "Commissions",
                    save_state: true,
                    save_state_area: "content_area",
                    onload_handler: app.pages.reports,
                    onload: function () {
                        var totalComm = 0, units = 0;
                        $.each(resp.COMM_VALUE,function(x){
                            totalComm = parseFloat(resp.COMM_VALUE[x]) + totalComm;
                            units = parseFloat(resp.UNITS_SOLD[x]) + units;
                        });
                        resp.PRODUCT_NAME.push("<b>Totals</b>");
                        resp.UNITS_SOLD.push("<b>"+units+"</b>");
                        resp.COMM_VALUE.push(totalComm);
                        resp.USER_NAME.push("");
                        resp.CREATED.push("");
                        app.ui.table({
                            id_to_append : "paginate_body",
                            headers : ["Product Name","Units Sold", "Commission","User Name", "Date Entered"],
                            values : [resp.PRODUCT_NAME,resp.UNITS_SOLD,resp.COMM_VALUE,resp.USER_NAME, resp.CREATED],
                            include_nums : true,
                            style : "",
                            mobile_collapse : true,
                            transform : {
                                2 : function(value,index){ //transform col 2 values to money
                                    if(index === (resp.PRODUCT_NAME.length - 1))
                                        return "<b>"+app.formatMoney(value)+"</b>";
                                    return app.formatMoney(value);
                                },
                                4 : function(value,index){
                                    if(index === (resp.PRODUCT_NAME.length - 1))
                                        return "";
                                    return new Date(value).toLocaleString();
                                }
                            }
                        });
                     }
                });
            }
        });
    }
    else if(type === "tax_history"){
        app.reportHistory({
            success : function(data){
                var resp = data.response.data;
                app.paginate({
                    title: "Taxes",
                    save_state: true,
                    save_state_area: "content_area",
                    onload_handler: app.pages.reports,
                    onload: function () {
                        var totalTax = 0, units = 0;
                        $.each(resp.TAX_VALUE,function(x){
                            totalTax = parseFloat(resp.TAX_VALUE[x]) + totalTax;
                            units = parseFloat(resp.UNITS_SOLD[x]) + units;
                        });
                        resp.PRODUCT_NAME.push("<b>Totals</b>");
                        resp.UNITS_SOLD.push("<b>"+units+"</b>");
                        resp.TAX_VALUE.push(totalTax);
                        resp.USER_NAME.push("");
                        resp.CREATED.push("");
                        app.ui.table({
                            id_to_append : "paginate_body",
                            headers : ["Product Name","Units Sold", "Tax","User Name", "Date Entered"],
                            values : [resp.PRODUCT_NAME,resp.UNITS_SOLD, resp.TAX_VALUE,resp.USER_NAME, resp.CREATED],
                            include_nums : true,
                            style : "",
                            mobile_collapse : true,
                            transform : {
                                2 : function(value,index){ //transform col 2 values to money
                                    if(index === (resp.PRODUCT_NAME.length - 1))
                                        return "<b>"+app.formatMoney(value)+"</b>";
                                    return app.formatMoney(value);
                                },
                                4 : function(value,index){
                                    if(index === (resp.PRODUCT_NAME.length - 1))
                                        return "";
                                    return new Date(value).toLocaleString();
                                }
                            }
                        });
                    }
                });
            }
        });
    }
    else if(type === "supplier_history"){
      app.reportHistory({
            success : function(data){
                var r = data.response.data;
                var totalAmount = 0;
                var totalUnits = 0;
                app.paginate({
                    title: "Suppliers",
                    save_state: true,
                    save_state_area: "content_area",
                    onload_handler: app.pages.reports,
                    onload: function () {
                        app.ui.table({
                            id_to_append: "paginate_body",
                            headers: ["Supplier Name", "Product Name","Product Units", "Amount","Entry Type","Narration","Username","Date"],
                            values: [r.SUPPLIER_NAME, r.PRODUCT_NAME,r.UNITS, r.TRANS_AMOUNT,r.TRAN_TYPE,r.NARRATION,r.USER_NAME,r.CREATED],
                            include_nums: true,
                            style: "",
                            mobile_collapse: true,
                            summarize : {
                                cols : [5],
                                lengths : [30]
                            },
                            transform : {
                                2 : function(value){
                                    totalUnits = totalUnits + parseFloat(value);  
                                    return value;
                                },
                                3 : function(value){
                                    totalAmount = totalAmount + parseFloat(value);
                                    return app.formatMoney(value);
                                },
                                4 : function(value){
                                    return value === "0" ? "<span style='color:green'>Stock Out</span>" : "<span style='color:red'>Stock In</span>";
                                },
                                7 : function(value){
                                    return new Date(value).toLocaleString();
                                }
                            },
                            onRender : function(id){
                               //append amounts
                               totalAmount = app.formatMoney(totalAmount);
                               $("#"+id).append("<tr><td></td> <td></td> <td><b>Totals</b></td> <td><b>"+totalUnits+"</b></td> <td><b>"+totalAmount+"</b></td></tr>");
                            }
                        }); 

                    }
                });
            }
        });  
    }
};




App.prototype.reportHistory = function(options){
    var data = app.getFormData(app.context.reports);
    var id = $("#search_products").attr("current-item");
    id = $("#search_products").val().trim() === ""  ? "all" : id;
    if (!data) return;
    if (Date.parse(data.end_date.value) < Date.parse(data.start_date.value)) {
        app.showMessage(app.context.invalid_dates);
        return;
    }
    var request = {
        id: id,
        user_name: $("#stock_select_users").val(),
        begin_date: data.start_date.value+" "+$("#start_time").val()+":00",
        end_date: data.end_date.value+" "+$("#stop_time").val()+":59",
        report_type : data.report_type.value,
        supplier_id : $("#stock_select_suppliers").val()
    };
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "stock_history",
        load: true,
        success: function (data) {
           options.success(data);
        }
    });
};

App.prototype.supplierAction = function(actionType){
    var id,oldSupplierName;
    if(actionType === "update" || actionType === "delete") {
        id = $("#search_suppliers").attr("current-item");
        oldSupplierName = $("#supplier_name").attr("old-supplier-name");
        if (!id) {
            //no item specified for updating
            app.showMessage(app.context.no_supplier_selected);
            return;
        }
    }

    var data = app.getFormData(app.context.suppliers);
    if (!data) return;

    var request = {
        supplier_name : data.supplier_name.value,
        country : data.country.value,
        city : data.city.value,
        postal_address : data.postal_address.value,
        phone_number : data.phone_number.value,
        email_address : data.email_address.value,
        company_website : data.company_website.value,
        contact_person_name : data.contact_person_name.value,
        contact_person_phone : data.contact_person_phone.value,
        action_type : actionType,
        supplier_id : id,
        old_supplier_name : oldSupplierName
    };
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "supplier_action",
        load: true,
        success: function (data) {
            if (data.response.data === "success") {
                if(actionType === "create"){
                    app.showMessage(app.context.create_supplier);
                }
                else if(actionType === "update"){
                    app.showMessage(app.context.update_supplier);
                }
                else if(actionType === "delete"){
                    app.showMessage(app.context.delete_supplier);
                }

            }
            else if (data.response.data === "fail") {
                app.showMessage(data.response.reason);
            }
        }
    });

};

App.prototype.createProduct = function () {
    var type = app.appData.formData.login.current_user.business_type;
    var context = type === "goods" ? app.context.product : app.context.service_product;
    var data = app.getFormData(context);
    if (!data) return;
    if (type === "services") {
        if(app.getSetting("track_stock") === "0"){
            //dont track
            data.product_quantity = {};
            data.product_quantity.value = 0;
        }
        data.product_bp_unit_cost = {};
        data.product_bp_unit_cost.value = 0;
        data.product_reminder_limit = {};
        data.product_reminder_limit.value = '1';
        data.product_expiry_date = {};
        data.product_expiry_date.value = '2015-01-01';
    }
    
    //take care of shared products
    var unitSize = 1;
    if(data.product_parent.value === data.product_name.value) {
        alert("Parent product cannot be the same as the product itself");
        $("#product_parent").focus();
        return;
    }
    else if(data.product_parent.value.trim().length > 0){
        unitSize = data.product_parent.value.length > 0 ?
                window.prompt("WARNING!\n Stock deductions for " + data.product_name.value + " will be made on " + data.product_parent.value + "\n Enter the product unit size: ") : 0;
        if (!unitSize || isNaN(unitSize))
            return; //this happens if the user pressed cancel
    }
    else {
        $("#product_parent").removeAttr("current-item");
    }
    var currentQty = parseFloat($("#current_product_quantity").html());
    var changeQty = parseFloat(data.product_quantity.value);
    var qtyType = $("#product_quantity_type").val();
    var newQty = qtyType === "increase" ? currentQty + changeQty : currentQty - changeQty;
    newQty = newQty < 0 ? 0 : newQty;
    var requestData = {
        product_name: data.product_name.value,
        product_quantity: newQty,
        product_category: data.product_category.value,
        product_sub_category: data.product_sub_category.value,
        product_bp_unit_cost: data.product_bp_unit_cost.value,
        product_sp_unit_cost: data.product_sp_unit_cost.value,
        product_reminder_limit: data.product_reminder_limit.value,
        product_expiry_date: data.product_expiry_date.value,
        product_narration: data.product_narration.value,
        product_unit_size : unitSize,
        product_parent : $("#product_parent").attr("current-item"),
        tax : data.tax.value,
        commission : data.commission.value,
        business_type: app.appData.formData.login.current_user.business_type
    };
    
    app.xhr({
        data : requestData,
        service : app.dominant_privilege,
        message : "create_product",
        load: true,
        success: function (data) {
            if (data.response.data === "SUCCESS") {
                app.showMessage(app.context.create_product);
                $("#product_parent").val("");
                $("#product_parent").removeAttr("current-item");
            }
            else if (data.response.data === "FAIL") {
                app.showMessage(data.response.reason);
            }
        }
    });
};


App.prototype.deleteProduct = function () {
    var id = $("#search_products").attr("current-item");
    if (!id) {
        //no item specified for updating
        app.showMessage(app.context.no_product_selected);
        return;
    }
    var requestData = {
        id: id
    };
    app.xhr({
        data : requestData,
        service : app.dominant_privilege,
        message : "delete_product",
        load: true,
        success: function (data) {
            console.log(data);
            if (data.response.data === "SUCCESS") {
                app.showMessage(app.context.product_deleted);
            }
            else if (data.response.data === "FAIL") {
                app.showMessage(data.response.reason);
            }
        }
    });
};

App.prototype.updateProduct = function () {
    var id = $("#search_products").attr("current-item");
    if (!id) {
        //no item specified for updating
        app.showMessage(app.context.no_product_selected);
        return;
    }
    
    var type = app.appData.formData.login.current_user.business_type;
    var context = type === "goods" ? app.context.product : app.context.service_product;
    var data = app.getFormData(context);
    if (!data) return;
    if (type === "services") {
        if(app.getSetting("track_stock") === "0"){
            //dont track
            data.product_quantity = {};
            data.product_quantity.value = 0;
        }
        data.product_bp_unit_cost = {};
        data.product_bp_unit_cost.value = 0;
        data.product_reminder_limit = {};
        data.product_reminder_limit.value = '1';
        data.product_expiry_date = {};
        data.product_expiry_date.value = '2015-01-01';
    }
    
    //take care of shared products
    var unitSize = 1;
    if(data.product_parent.value === data.product_name.value) {
        alert("Parent product cannot be the same as the product itself");
        $("#product_parent").focus();
        return;
    }
    else if(data.product_parent.value.trim().length > 0){
        unitSize = data.product_parent.value.length > 0 ?
                window.prompt("WARNING!\n Stock deductions for " + data.product_name.value + " will be made on " + data.product_parent.value + "\n Enter the product unit size: ") : 0;
        if(!unitSize || isNaN(unitSize))
            return; //this happens if the user pressed cancel
    }
    else {
        $("#product_parent").removeAttr("current-item");
    }
    var currentQty = parseFloat($("#current_product_quantity").html());
    var changeQty = parseFloat(data.product_quantity.value);
    var qtyType = $("#product_quantity_type").val();
    var newQty = qtyType === "increase" ? currentQty + changeQty : currentQty - changeQty;
    newQty = newQty < 0 ? 0 : newQty;
    var requestData = {
            id: id,
            old_product_name: $("#product_name").attr("old-product-name"),
            product_name: data.product_name.value,
            product_quantity: newQty,
            product_category: data.product_category.value,
            product_sub_category: data.product_sub_category.value,
            product_bp_unit_cost: data.product_bp_unit_cost.value,
            product_sp_unit_cost: data.product_sp_unit_cost.value,
            product_reminder_limit: data.product_reminder_limit.value,
            product_expiry_date: data.product_expiry_date.value,
            product_narration: data.product_narration.value,
            product_unit_size : unitSize,
            product_parent : $("#product_parent").attr("current-item"),
            tax : data.tax.value,
            commission : data.commission.value,
            business_type: app.appData.formData.login.current_user.business_type
    };

    app.xhr({
        data : requestData,
        service : app.dominant_privilege,
        message : "update_product",
        load: true,
        success: function (data) {
            if (data.response.data === "SUCCESS") {
                app.showMessage(app.context.product_updated);
                $("#product_parent").val("");
                $("#product_parent").removeAttr("current-item");
            }
            else if (data.response.data === "FAIL") {
                app.showMessage(data.response.reason);
            }
        },
        error: function () {
            //do something fun
            app.showMessage(app.context.error_message);
        }
    });
};

App.prototype.saveBusiness = function (actionType) {
    var data,request;
    if (actionType === "create" || actionType === "update") {
        data = app.getFormData(app.context.business);
        if (!data) return;
        var conf = confirm(app.context.business_create_confirm);
        if (!conf) return;
        
        request = {
            action_type: actionType,
            business_name: data.business_name.value,
            country: data.country.value,
            city: data.city.value,
            postal_address: data.postal_address.value,
            phone_number: data.phone_number.value,
            company_website: data.company_website.value,
            business_type: data.business_type.value,
            business_owner: app.appData.formData.login.current_user.name,
            business_descrip: data.business_descrip.value
        };
    }
    else if (actionType === "delete") {
        var conf1 = confirm(app.context.business_delete_confirm);
        if (!conf1) return;
        
        request = {
            action_type: actionType,
            business_owner: localStorage.getItem("business_owner")
        };
    }
   
    var svc = actionType === "delete" ? "open_data_service,pos_admin_service" : "open_data_service";
    var msg = actionType === "delete" ? "save_business,delete_business" : "save_business";
    app.xhr({
        data : request,
        service : svc,
        message : msg,
        load: true,
        success: function (data) {
            var resp = actionType === "delete" ? data.response.open_data_service_save_business.data : data.response.data;
            var reason = actionType === "delete" ? data.response.open_data_service_save_business.reason : data.response.reason;
            if (resp === "success") {
                app.showMessage(app.context.action_success);
                alert("Business settings changed, please sign in again");
                app.logout();
            }
            else if (resp === "fail") {
                app.showMessage(app.context.action_failed + " : " + reason);
            }
        }
    });
};


App.prototype.stockExpiry = function (handler) {
    app.xhr({
        data : {},
        service : app.dominant_privilege,
        message : "stock_expiry",
        load: true,
        success: function (data) {
            var resp = data.response.data;
            //name,username,narr,time,type
            app.paginate({
                title: "Stock Expiry",
                save_state: true,
                save_state_area: "content_area",
                onload_handler: handler,
                onload: function () {
                    app.ui.table({
                        id_to_append : "paginate_body",
                        headers : ["Product Name", "Expiry Date", "Date Entered"],
                        values : [resp.PRODUCT_NAME, resp.PRODUCT_EXPIRY_DATE, resp.CREATED],
                        include_nums : true,
                        style : "",
                        mobile_collapse : true,
                        transform : {
                            1 : function(value){
                                return new Date(parseInt(value)).toLocaleString();
                            },
                            2 : function (value) {
                                return new Date(parseInt(value)).toLocaleString();
                            }
                        }
                    });
                }
            });
        }
    });
};

App.prototype.stockLow = function (handler) {
    app.xhr({
        data : {},
        service : app.dominant_privilege,
        message : "stock_low",
        load: true,
        success: function (data) {
            var resp = data.response.data;
            //name,username,narr,time,type
            app.paginate({
                title: "Stock Running Low",
                save_state: true,
                save_state_area: "content_area",
                onload_handler: handler,
                onload: function () {
                    app.ui.table({
                        id_to_append : "paginate_body",
                        headers : ["Product Name", "Product Quantity", "Product Remind Limit", "Date Entered"],
                        values : [resp.PRODUCT_NAME, resp.PRODUCT_QTY, resp.PRODUCT_REMIND_LIMIT, resp.CREATED],
                        include_nums : true,
                        style : "",
                        mobile_collapse : true,
                        transform: {
                            3: function (value) {
                                return new Date(parseInt(value)).toLocaleString();
                            }
                        }
                    });
                }
            });
        }
    });
};


App.prototype.undoSale = function (prodId, prodQty) {
    var html = "<input type='text' class='form-control' id='undo_sale_narr' placeholder='Reason for Reversal'>";
    var m = app.ui.modal(html, "Undo Transaction", {
        ok: function () {
            var narr = $("#undo_sale_narr").val();
            var prodIds = [prodId];
            var qtys = [prodQty];
            var request = {
                product_ids: prodIds,
                product_qtys: qtys,
                tran_type: "1",
                narration: narr,
                tran_flag: "reversal_of_sale"
            };
            //do some stuff like saving to the server
            app.xhr({
                data : request,
                service : app.dominant_privilege,
                message : "transact",
                load: true,
                success: function (data) {
                    var resp = data.response.data;
                    m.modal('hide');
                    if (resp === "success") {
                        //well transaction successful
                        app.showMessage(app.context.reverse_success);
                    }
                    else if (resp === "fail") {
                        app.showMessage(app.context.transact_fail);
                    }
                },
                error: function () {
                    //do something 
                    app.showMessage(app.context.error_message);
                }
            });
        },
        cancel: function () {
            //what to do?
        },
        okText: "Proceed",
        cancelText: "Cancel"
    });
};


App.prototype.addProductCategory = function(){
   var cat = $("#product_categories").val();
   var username = $("#email_address").val();
   if(username === ""){
       app.showMessage("Username is required");
       return;
   }
   var request = {
       category : cat,
       username : username
   };
   app.xhr({
       data : request,
       service : app.dominant_privilege,
       message : "add_category",
       load : true,
       success : function(resp){
          var r = resp.response.data;
          if(r === "success"){
              app.showMessage("Category added successfully");
          }
          else if(r === "fail"){
            app.showMessage(resp.response.reason);  
          }
       }
   });
};

App.prototype.fetchProductCategory = function(){
    var username = $("#email_address").val();
    var request = {
        username: username
    };
    app.xhr({
        data : request,
        service : app.dominant_privilege,
        message : "fetch_categories",
        load: false,
        success: function (resp) {
            var r = resp.response.data;
            $("#product_categories_display").html(r.CATEGORY.toString());
        }
    }); 
};

App.prototype.payBill = function () {
    //we pay the bill using mpesa so we need to read the phone no and transaction id
    app.paginate({
        title: "Pay Bill M-pesa",
        save_state: true,
        save_state_area: "content_area",
        onload_handler: app.pages.billing,
        onload: function () {
            $("#paginate_print").remove(); //remove the print button
            app.loadPage({
                load_url: app.pages.pay_bill,
                load_area: "paginate_body",
                onload: function () {
                    //load the amount due
                    app.xhr({
                        data : {},
                        service : "open_data_service",
                        message : "fetch_account_balance",
                        load: true,
                        success: function (resp) {
                            $("#bill_amount_due").html(app.formatMoney(resp.response.data.balance));
                        }
                    });
                }
            });
        }
    });
};

App.prototype.billingHistory = function(){
    app.xhr({
        data : {},
        service : "open_data_service",
        message : "billing_history",
        load: true,
        success: function (resp) {
            var h = resp.response.data;
            if(!h) return;
            app.paginate({
                title: "Billing History",
                save_state: true,
                save_state_area: "content_area",
                onload_handler: app.pages.billing,
                onload: function () {
                    app.ui.table({
                        id_to_append: "paginate_body",
                        headers: ["Payment Channel", "Type", "Date Entered"],
                        values: [h.SENDER_SERVICE, h.TRAN_TYPE, h.TIMESTAMP],
                        include_nums: true,
                        style: "",
                        mobile_collapse: true,
                        transform : {
                            1 : function(value){
                                var style = value === "1" ? "color : green" : "color : red";
                                var span = value === "1" ? "<span style='"+style+"' >Bill Payment</span>" : "<span '"+style+"'>Invoice</span>";
                                return span;
                            },
                            2 : function(value){
                                return new Date(parseInt(value)).toLocaleString();
                            }
                        }
                    }); 
                }
            });
        }
    }); 
};

App.prototype.verifyPayBill = function () {
    var data = app.getFormData(app.context.pay_bill);
    if (!data)
        return;
    var requestData = {
        phone_no: data.phone_no.value,
        trans_id: data.trans_id.value
    };
    app.xhr({
        data : requestData,
        service : "open_data_service",
        message : "verify_bill_mpesa",
        load: true,
        success: function (resp) {
            if (resp.response.data === "fail") {
                app.showMessage(resp.response.reason);
            }
            else if (resp.response.data === "success") {
                app.showMessage(app.context.transaction_verified, "green");
            }
        }
    });

};
