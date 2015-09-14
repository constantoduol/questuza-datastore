App.prototype.login = function () {
    app.context = app.appData.formData.login;
    var data = app.getFormData(app.context);
    localStorage.removeItem("session_id"); //remove the previous session id
    if (!data)
        return;
    var requestData = {
        username: data.username.value,
        password: data.password.value
    };
    app.xhr({
        data : requestData,
        service :  "open_data_service,open_data_service",
        message : "login,business_info",
        load: true,
        success: function (resp) {
            var binfo = resp.response.open_data_service_business_info.data;
            var login = resp.response.open_data_service_login.data;
            if (login.response === "loginsuccess") {
                //get the session id
                localStorage.setItem("session_id", login.rand);
                localStorage.setItem("current_user", login.user);
                localStorage.setItem("privileges", login.privileges);
                localStorage.setItem("host", login.host);
                app.navigate(login.privileges, binfo);
            }
            else if (login === "changepass") {
                window.location = "change.html?user_name=" + data.username.value;
            }
            else {
                app.showMessage(app.context.messages[login]);
            }
        },
        error: function () {
            //do something 
            app.showMessage(app.context.error_message);
        }
    });
    return false;
};

App.prototype.fetchBusinessSettings = function(busId){
  app.xhr({
      data : {},
      service : "open_data_service",
      message : "fetch_settings",
      load : false,
      cache : true,
      success : function(resp){
          var r = resp.response.data;
          localStorage.setItem("settings", JSON.stringify(r));  
      }
  });
};

App.prototype.logout = function () {
    var requestData = {
        user_name: app.appData.formData.login.current_user
    };
    app.xhr({
        data : requestData,
        service : "open_data_service",
        message : "logout",
        load: true,
        success: function (data) {
            //login again
            localStorage.removeItem("session_id");
            localStorage.removeItem("current_user");
            localStorage.removeItem("privileges");
            localStorage.removeItem("host");
            localStorage.removeItem("business_name");
            localStorage.removeItem("business_id");
            localStorage.removeItem("business_type");
            localStorage.removeItem("business_owner");
            localStorage.removeItem("settings");
            window.location = "index.html";
        },
        error: function () {
            //do something 
            $("#" + app.context.error_space).html(app.context.error_message);
        }
    });
};


App.prototype.changePassword = function () {
    app.context = app.appData.formData.change_pass;
    var data = app.getFormData(app.context);
    if (!data)
        return;
    if (data.new_password.value !== data.confirm_password.value) {
        //do something cool
        app.showMessage(app.context.passwords_not_match);
        return;
    }
    var reg = /^(?=.*\d).{4,50}$/;
    var valid = reg.test(data.confirm_password.value);
    if (!valid) {
        app.showMessage(app.context.password_not_valid);
        return;
    }
    var requestData = {
        user_name: data.user_name.value,
        old_password: data.old_password.value,
        new_password: data.new_password.value,
        confirm_password: data.confirm_password.value
    };
    app.xhr({
        data : requestData,
        service : "open_data_service",
        message : "changepass",
        load: true,
        success: function (data) {
            if (data.response.data === true) {
                //login again
                window.location = "index.html";
            }
            else {
                app.showMessage(app.context.messages["false"]);
            }
        },
        error: function () {
            //do something 
            app.showMessage(app.context.error_message);
        }
    });
    return false;
};


App.prototype.navigate = function (privileges, buss) {
    var adminIndex = privileges.indexOf("pos_admin_service");
    var saleIndex = privileges.indexOf("pos_sale_service");
    //if you have more than one business id, navigate to the correct one
    if (adminIndex > -1 && saleIndex > -1) {
        //you have to select because you have both privileges
        var html = "<select id='select_role'>\n\
                    <option value='seller'>Seller</option>\n\
                    <option value='admin'>Admin</option></select>";

        app.ui.modal(html, "Select Role", {
            ok: function () {
                var role = $("#select_role").val();
                if (role === "seller") {
                    app.navigateBusiness(buss, "sale.html");
                }
                else if (role === "admin") {
                    app.navigateBusiness(buss, "admin.html");
                }
            },
            cancel: function () {

            },
            okText: "Proceed",
            cancelText: "Cancel"
        });

    }
    else if (adminIndex > -1) {
        //you're only an admin
        app.navigateBusiness(buss, "admin.html");
    }
    else if (saleIndex > -1) {
        //you're a salesperson 
        app.navigateBusiness(buss, "sale.html");
    }
    else {
        //you have nothing...
        //no privileges found
        //thats strange
    }
    

};


App.prototype.navigateBusiness = function (buss, url) {
    if (buss.business_ids && buss.business_ids.length === 1) {
        localStorage.setItem("business_type", buss.business_types[0]);
        localStorage.setItem("business_name", buss.business_names[0]);
        localStorage.setItem("business_owner", buss.business_owners[0]);
        localStorage.setItem("business_id", buss.business_ids[0]);
        window.location = url;
    }
    else if (buss.business_ids && buss.business_ids.length > 1) {
        var options = "";
        for (var x = 0; x < buss.business_names.length; x++) {
            var option = "<option value=" + buss.business_ids[x] + ">" + buss.business_names[x] + "</option>";
            options = options + option;
        }
        var html = "<select id='select_business_id'>" + options + "</select>";
        app.ui.modal(html, "Select Business", {
            ok: function () {
                var businessId = $("#select_business_id").val();
                var businessType = buss.business_types[buss.business_ids.indexOf(businessId)];
                var businessName = buss.business_names[buss.business_ids.indexOf(businessId)];
                var businessOwner = buss.business_owners[buss.business_ids.indexOf(businessId)];
                localStorage.setItem("business_type", businessType);
                localStorage.setItem("business_name", businessName);
                localStorage.setItem("business_owner", businessOwner);
                localStorage.setItem("business_id", businessId);
                window.location = url;
            },
            cancel: function () {

            },
            okText: "Proceed",
            cancelText: "Cancel"
        });

    }
    else {
        //you have no business at all
        console.log("no business set");
        window.location = url;

    }
};

App.prototype.createAccount = function () {
    app.context = app.appData.formData.create_account;
    var data = app.getFormData(app.context);
    if (!data)
        return;
    if (data.password.value !== data.confirm_password.value) {
        //do something cool
        app.showMessage(app.context.passwords_not_match);
        return;
    }
    var reg = /^(?=.*\d).{4,50}$/;
    var valid = reg.test(data.confirm_password.value);
    if (!valid) {
        app.showMessage(app.context.password_not_valid);
        return;
    }
    app.appData.formData.login.current_user.business_id = "";
    var requestData = {
        name: data.user_name.value,
        password: data.password.value,
        privs: ["pos_admin_service", "user_service", "pos_sale_service"],
        host: "localhost",
        real_name: data.real_name.value
    };
    app.xhr({
        data : requestData,
        service : "open_data_service",
        message : "create_account",
        load: true,
        success: function (resp) {
            if (resp.response.data === "success") {
                app.ui.modal(app.context.create_account_success, "User Account", {
                    ok: function () {
                        window.location = "index.html";
                    },
                    cancel: function () {
                        window.location = "index.html";
                    },
                    okText: "Proceed",
                    cancelText: "Cancel"
                });
            }
            else if (resp.response.data === "fail") {
                app.showMessage(app.context.create_account_fail);
            }
        },
        error: function () {
            //do something 
            app.showMessage(app.context.error_message);
        }
    });
    return false;
};
