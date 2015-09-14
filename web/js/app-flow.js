AppData.prototype.formData = {
    onload: AppData.prototype.onload,
    login: {
        fields: {
            username: {required: true, message: "Email address is required"},
            password: {required: true, message: "Password is required"}
        },
        error_space: "error_space_login",
        load_area: "error_space_login",
        error_message: "The server is unavailable or you have no network connection",
        businesss_required: "Both email and business name are required!",
        password_reset_success: "An email has been sent to your address, use it to reset your password",
        current_user: {
            name: localStorage.getItem("current_user"),
            host: localStorage.getItem("host"),
            business_type: localStorage.getItem("business_type"),
            dominantPrivilege: function () {
                var privs = localStorage.getItem("privileges");
                if (privs && privs.indexOf("pos_admin_service") > -1) {
                    return "pos_admin_service";
                }
                else if (privs && privs.indexOf("pos_sale_service") > -1) {
                    return "pos_sale_service";
                }
            }
        },
        messages: {
            invalidpass: "The password you entered is invalid",
            notexist: "User account does not exist",
            disabled: "User account has been disabled"
        }
    },
    create_account: {
        fields: {
            user_name: {required: true, message: "Email address is required"},
            real_name: {required: true, message: "Name is required"},
            password: {required: true, message: "Password is required"},
            confirm_password: {required: true, message: "Confirm password is required"}
        },
        error_space: "error_space_create",
        load_area: "error_space_create",
        error_message: "The server is unavailable or you have no network connection",
        passwords_not_match: "The passwords entered do not match",
        password_not_valid: "Password should be more than 4 characters, have at least one number and be less than 50 characters",
        create_account_success: "User account was created successfully, check your email to activate your account",
        create_account_fail: "User account already exists, try a different email address"
    },
    change_pass: {
        fields: {
            user_name: {required: true, message: "Email address is required"},
            old_password: {required: true, message: "Old password is required"},
            new_password: {required: true, message: "New password is required"},
            confirm_password: {required: true, message: "Confirm password is required"}
        },
        error_space: "error_space_login",
        load_area: "error_space_login",
        error_message: "The server is unavailable or you have no network connection",
        passwords_not_match: "New password and confirm password do not match",
        password_not_valid: "Password should be more than 4 characters, have at least one number and be less than 50 characters",
        messages: {
            false: "The old password entered is invalid"
        }
    },
    sale: {
        product: {
            fields: {
                search_products: {
                    autocomplete: {
                        id: "search_products",
                        entity: "PRODUCT_DATA",
                        column: ["*"],
                        where_values: function () {
                            return [$("#search_products").val()];
                        },
                        where_cols: ["PRODUCT_NAME"],
                        where_operators: [">="],
                        orderby: "PRODUCT_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_NAME",
                        data: {},
                        selected: [],
                        after: function (data, index) {
                            app.sale(data, index);
                            app.runLater(200, function () {
                                $("#search_products").val("");  //clear the search box
                            });
                        }
                    }}
            }
        },
        error_space: "error_space_sale",
        load_area: "error_space_sale",
        error_message: "The server is unavailable or you have no network connection",
        commit_sale: "Do you wish to commit transaction?",
        invalid_qty: "An invalid quantity has been specified for this item",
        insufficient_stock: "There is not sufficient stock to proceed with the sale",
        no_product_selected: "No products have been selected for sale",
        transact_fail: "Transaction failed",
        transact_success: "Transaction was successful",
        reverse_success: "Transaction reversed successfully"
    },
    admin: {
        user: {
            fields: {
                search_users: {
                    autocomplete: {
                        id: "search_users",
                        entity: "BUSINESS_USERS",
                        column: ["USER_NAME", "ID"],
                        where_cols: ["USER_NAME"],
                        where_values: function () {
                            return [$("#search_users").val()];
                        },
                        where_operators: [">="],
                        orderby: "USER_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "USER_NAME",
                        data: {},
                        after: function (data, index) {
                            var name = data.USER_NAME[index];
                            $("#email_address").val(name);
                            var request = {
                                name: name
                            };
                            app.xhr({
                                data : request,
                                service : "user_service",
                                message : "view_user",
                                load: false,
                                success: function (data) {
                                    var privs = data.response.data.priv_data;
                                    if (privs.indexOf("pos_admin_service") > -1) {
                                        $("#user_role").val("admin");
                                    }
                                    else {
                                        $("#user_role").val("seller");
                                    }
                                },
                                error: function () {
                                    //do something fun
                                    app.showMessage(app.context.error_message);
                                }
                            });
                        }
                    }
                },
                email_address: {required: true, message: "Email address is required"},
                user_role: {required: true, message: "User role is required"},
                real_name: {required: false}
            }
        },
        service_product: {
            fields: {
                search_products: {
                    autocomplete: {
                        id: "search_products",
                        entity: "PRODUCT_DATA",
                        column: ["*"],
                        where_values: function () {
                            return [$("#search_products").val()];
                        },
                        where_cols: ["PRODUCT_NAME"],
                        where_operators: [">="],
                        orderby: "PRODUCT_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_NAME",
                        data: {},
                        after: function (data, index) {
                            var currentProduct = data.PRODUCT_NAME[index];
                            $("#product_name").attr("old-product-name", currentProduct);
                        }
                    },
                    autocomplete_handler: {
                        fields: {
                            product_name: ["PRODUCT_NAME", "string"],
                            current_product_quantity: ["PRODUCT_QTY", "number","html"],
                            product_category: ["PRODUCT_CATEGORY", "string"],
                            product_sub_category: ["PRODUCT_CATEGORY", "string"],
                            product_bp_unit_cost: ["BP_UNIT_COST", "money"],
                            product_sp_unit_cost: ["SP_UNIT_COST", "money"],
                            product_reminder_limit: ["PRODUCT_REMIND_LIMIT", "number"],
                            product_expiry_date: ["PRODUCT_EXPIRY_DATE", "date"],
                            product_narration: ["PRODUCT_NARRATION", "string"],
                            tax: ["TAX", "string"],
                            commission: ["COMMISSION", "string"]
                        }
                    }
                },
                product_quantity: {required: false, sign: "+"},
                product_name: {required: true, message: "Product name is required"},
                product_category: {
                    required: false,
                    autocomplete: {
                        id: "product_category",
                        entity: "PRODUCT_DATA",
                        column: ["PRODUCT_CATEGORY"],
                        where_values: function () {
                            return [$("#product_category").val()];
                        },
                        where_cols: ["PRODUCT_CATEGORY"],
                        where_operators: [">="],
                        orderby: "PRODUCT_CATEGORY",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_CATEGORY",
                        data: {}
                    }
                },
                product_sub_category: {
                    required: false,
                    autocomplete: {
                        id: "product_sub_category",
                        entity: "PRODUCT_DATA",
                        column: ["PRODUCT_SUB_CATEGORY"],
                        where_values: function () {
                            return [$("#product_sub_category").val()];
                        },
                        where_cols: ["PRODUCT_SUB_CATEGORY"],
                        where_operators: [">="],
                        orderby: "PRODUCT_SUB_CATEGORY",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_SUB_CATEGORY",
                        data: {}
                    }
                },
                product_parent: {
                    required: false,
                    autocomplete: {
                        id: "product_parent",
                        entity: "PRODUCT_DATA",
                        column: ["*"],
                        where_values: function () {
                            return [$("#product_parent").val()];
                        },
                        where_cols: ["PRODUCT_NAME"],
                        where_operators: [">="],
                        orderby: "PRODUCT_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_NAME",
                        data: {},
                        after: function (data, index) {
                            var prodId = data.ID[index];
                            $("#product_parent").attr("current-item", prodId);
                        }
                    }
                },
                product_sp_unit_cost: {required: true, message: "Product selling price per unit is required", sign: "+"},
                product_narration: {required: false},
                tax: {required: false, sign: "+"},
                commission: {required: false, sign: "+"}
            }
        },
        product: {
            fields: {
                search_products: {
                    autocomplete: {
                        id: "search_products",
                        entity: "PRODUCT_DATA",
                        column: ["*"],
                        where_values: function () {
                            return [$("#search_products").val()];
                        },
                        where_cols: ["PRODUCT_NAME"],
                        where_operators: [">="],
                        orderby: "PRODUCT_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_NAME",
                        data: {},
                        after: function (data, index) {
                            var currentProduct = data.PRODUCT_NAME[index];
                            $("#product_name").attr("old-product-name", currentProduct);
                        }
                    },
                    autocomplete_handler: {
                        fields: {
                            product_name: ["PRODUCT_NAME", "string"],
                            current_product_quantity: ["PRODUCT_QTY", "number","html"],
                            product_category: ["PRODUCT_CATEGORY", "string"],
                            product_sub_category: ["PRODUCT_CATEGORY", "string"],
                            product_bp_unit_cost: ["BP_UNIT_COST", "money"],
                            product_sp_unit_cost: ["SP_UNIT_COST", "money"],
                            product_reminder_limit: ["PRODUCT_REMIND_LIMIT", "number"],
                            product_expiry_date: ["PRODUCT_EXPIRY_DATE", "date"],
                            product_narration: ["PRODUCT_NARRATION", "string"],
                            tax: ["TAX", "string"],
                            commission: ["COMMISSION", "string"]
                        },
                        after: function (data, index) {
                            var parentId = data.PRODUCT_PARENT[index];
                            $("#product_parent").attr("current-item", parentId);
                            app.fetchItemById({
                                entity: "PRODUCT_DATA",
                                columns: ["*"],
                                where_cols: function () {
                                    return ["ID"];
                                },
                                where_values: function () {
                                    return [parentId];
                                },
                                success: function (data) {
                                    var r = data.response.data;
                                    $("#product_parent").val(r.PRODUCT_NAME[0]);
                                }
                            });
                        }
                    }
                },
                product_name: {required: true, message: "Product name is required"},
                product_quantity: {required: true, message: "Product quantity is required", sign: "+"},
                product_category: {
                    required: false,
                    autocomplete: {
                        id: "product_category",
                        entity: "PRODUCT_DATA",
                        column: ["PRODUCT_CATEGORY"],
                        where_values: function () {
                            return [$("#product_category").val()];
                        },
                        where_cols: ["PRODUCT_CATEGORY"],
                        where_operators: [">="],
                        orderby: "PRODUCT_CATEGORY",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_CATEGORY",
                        data: {}
                    }
                },
                product_sub_category: {
                    required: false,
                    autocomplete: {
                        id: "product_sub_category",
                        entity: "PRODUCT_DATA",
                        column: ["PRODUCT_SUB_CATEGORY"],
                        where_values: function () {
                            return [$("#product_sub_category").val()];
                        },
                        where_cols: ["PRODUCT_SUB_CATEGORY"],
                        where_operators: [">="],
                        orderby: "PRODUCT_SUB_CATEGORY",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_SUB_CATEGORY",
                        data: {}
                    }
                },
                product_parent: {
                    required: false,
                    autocomplete: {
                        id: "product_parent",
                        entity: "PRODUCT_DATA",
                        column: ["*"],
                        where_values: function () {
                            return [$("#product_parent").val()];
                        },
                        where_cols: ["PRODUCT_NAME"],
                        where_operators: [">="],
                        orderby: "PRODUCT_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_NAME",
                        data: {},
                        after: function (data, index) {
                            var prodId = data.ID[index];
                            $("#product_parent").attr("current-item", prodId);
                        }
                    }
                },
                product_bp_unit_cost: {required: true, message: "Product buying price per unit is required", sign: "+"},
                product_sp_unit_cost: {required: true, message: "Product selling price per unit is required", sign: "+"},
                product_reminder_limit: {required: true, message: "Product reminder limit is required", sign: "+"},
                product_expiry_date: {required: true, message: "Product expiry date required"},
                product_narration: {required: false},
                tax: {required: false, sign: "+"},
                commission: {required: false, sign: "+"}
            }
        },
        suppliers: {
            fields: {
                search_suppliers: {
                    autocomplete: {
                        id: "search_suppliers",
                        entity: "SUPPLIER_DATA",
                        column: ["*"],
                        where_values: function () {
                            return [$("#search_suppliers").val()];
                        },
                        where_cols: ["SUPPLIER_NAME"],
                        where_operators: [">="],
                        orderby: "SUPPLIER_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "SUPPLIER_NAME",
                        data: {},
                        after: function (data, index) {
                            var currentSupplier = data.SUPPLIER_NAME[index];
                            $("#supplier_name").attr("old-supplier-name", currentSupplier);
                        }
                    },
                    autocomplete_handler: {
                        fields: {
                            supplier_name: ["SUPPLIER_NAME", "string"],
                            phone_number: ["PHONE_NUMBER", "string"],
                            email_address: ["EMAIL_ADDRESS", "string"],
                            postal_address: ["POSTAL_ADDRESS", "string"],
                            company_website: ["WEBSITE", "string"],
                            contact_person_name: ["CONTACT_PERSON_NAME", "string"],
                            contact_person_phone: ["CONTACT_PERSON_PHONE", "string"],
                            city: ["CITY", "string"],
                            country: ["COUNTRY", "string"]
                        }
                    }
                },
                supplier_name: {required: true, message: "Supplier's name is required"},
                phone_number: {required: false},
                email_address: {required: false},
                postal_address: {required: false},
                company_website: {required: false},
                contact_person_name: {required: false},
                contact_person_phone: {required: false},
                city: {required: false},
                country: {required: false}
            },
            help_url: "/help/suppliers.html"
        },
        supplier_account: {
            fields: {
                entry_type: {required: true, message: "Entry type is required"},
                amount: {required: true, message: "Amount is required", sign: "+"},
                units_received: {required: true, message: "Units received is required", sign: "+"},
                sp_per_unit: {required: true, message: "Selling price per unit is required", sign: "+"},
                narration: {required: true, message: "Narration is required"}
            }
        },
        settings: {
            fields: {
                enable_undo_sales: {required: true},
                add_tax: {required: true},
                add_comm: {required: true},
                add_purchases: {required: true},
                track_stock: {required: true},
                user_interface: {required: false}
            }
        },
        reports: {
            fields: {
                report_type: {required: true, message: "Report type is required"},
                start_date: {required: true, message: "Start date is required"},
                end_date: {required: true, message: "End date is required"},
                product_categories: {required: true, message: "Product category is required"},
                search_products: {
                    required: false,
                    autocomplete: {
                        id: "search_products",
                        entity: "PRODUCT_DATA",
                        column: ["*"],
                        where_values: function () {
                            return [$("#search_products").val()];
                        },
                        where_cols: ["PRODUCT_NAME"],
                        where_operators: [">="],
                        orderby: "PRODUCT_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "PRODUCT_NAME",
                        data: {},
                        after: function (data, index) {
                            var prodId = data.ID[index];
                            var name = data.PRODUCT_NAME[index];
                            $("#product_parent").val(name);
                            $("#product_parent").attr("current-item", prodId);
                        }
                    }
                }
            }
        },
        expense: {
            fields: {
                resource_type: {required: true, message: "Resource type is required"},
                expense_name: {
                    required: true,
                    message: "Expense/Income name is required",
                    autocomplete: {
                        id: "expense_name",
                        entity: "EXPENSE_DATA",
                        column: ["RESOURCE_NAME"],
                        where_values: function () {
                            return [$("#expense_name").val(), $("#resource_type").val()];
                        },
                        where_cols: ["RESOURCE_NAME", "RESOURCE_TYPE"],
                        where_operators: [">=", "="],
                        orderby: "RESOURCE_NAME",
                        order_direction: "ASC",
                        limit: 10,
                        key: "RESOURCE_NAME",
                        data: {},
                        after: function (data, index) {
                            console.log(data);
                        }
                    }
                },
                expense_amount: {required: true, message: "Expense/Income amount is required", sign: "+"}
            }
        },
        pay_bill: {
            fields: {
                phone_no: {required: true, message: "Phone number is required"},
                trans_id: {required: true, message: "M-Pesa transaction id is required"}
            }
        },
        profit_and_loss: {
            fields: {
                start_date: {required: true, message: "Start date is required"},
                end_date: {required: true, message: "End date is required"}
            }
        },
        business: {
            fields: {
                business_name: {required: true, message: "Business name is required"},
                country: {required: true, message: "Country is required"},
                city: {required: true, message: "City is required"},
                postal_address: {required: false},
                phone_number: {required: false},
                company_website: {required: false},
                business_type: {required: true, message: "Business type is required"},
                business_category: {required: true, message: "Business category is required"},
                business_descrip: {required: false}
            }
        },
        error_space: "error_space_admin",
        load_area: "error_space_admin",
        error_message: "The server is unavailable or you have no network connection",
        create_user: "User created successfully, user should check email for login credentials",
        email_invalid: "The email address entered is invalid",
        update_user: "The user was updated successfully",
        delete_user: "The user was deleted successfully",
        delete_user_confirm: "Delete user ? This action cannot be undone",
        disable_user: "The user account was disabled successfully",
        disable_user_confirm: "Disable user account?",
        enable_user: "The user account was enabled successfully",
        enable_user_confirm: "Enable user account?",
        create_product: "Product created successfully",
        create_supplier: "Supplier created successfully",
        update_supplier: "Supplier updated successfully",
        delete_supplier: "Supplier deleted successfully",
        no_product_selected: "You have not selected any product, search to select",
        no_supplier_selected: "You have not selected any supplier, search to select",
        supplier_added: "Supplier was added successfully",
        supplier_deleted: "Supplier was deleted successfully",
        delete_product_confirm: "Delete product ? This action cannot be undone",
        product_updated: "Product updated successfully",
        product_deleted: "Product deleted successfully",
        invalid_dates: "End date cannot be less than starting date",
        reset_password: "User password reset successfully",
        business_saved: "Business details saved successfully",
        action_success: "Requested action was completed successfully",
        action_failed: "Requested action failed",
        business_create_confirm: "Create a new Business ?",
        business_delete_confirm: "Delete business? You will lose all records for this business",
        business_deleted_success: "Business deleted successfully",
        resource_success: "{resource_type} was added successfully",
        transaction_verified: "Congratulations! Transaction was verified successfully"
    }
};
