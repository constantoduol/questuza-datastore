/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.quest.pos;

import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.FetchOptions;
import com.google.appengine.api.datastore.PropertyProjection;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.google.appengine.api.datastore.Query.SortDirection;
import com.quest.access.common.UniqueRandom;
import com.quest.access.common.datastore.Datastore;
import com.quest.access.common.io;
import com.quest.access.control.Server;
import com.quest.access.useraccess.Serviceable;
import com.quest.access.useraccess.services.Message;
import com.quest.access.useraccess.services.annotations.Endpoint;
import com.quest.access.useraccess.services.annotations.WebService;
import com.quest.access.useraccess.verification.UserAction;
import com.quest.servlets.ClientWorker;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author Connie
 */
@WebService(name = "pos_admin_service", level = 10, privileged = "yes")
public class PosAdminService implements Serviceable {

    @Override
    public void service() {

    }

    @Override
    public void onStart(Server serv) {
        serv.addSafeEntity("BUSINESS_USERS", new JSONArray().put("USER_NAME").put("ID"));
        serv.addSafeEntity("PRODUCT_DATA", new JSONArray().put("*"));
        serv.addSafeEntity("SUPPLIER_DATA", new JSONArray().put("*"));
        serv.addSafeEntity("EXPENSE_DATA", new JSONArray().put("RESOURCE_NAME"));
        serv.addSafeEntity("POS_META_DATA", new JSONArray().put("*"));

        //initialise settings

    }

    public void onPreExecute(Server serv, ClientWorker worker) {

    }

    @Endpoint(name = "add_resource")
    public void addResource(Server serv, ClientWorker worker) throws Exception {
        JSONObject requestData = worker.getRequestData();
        String type = requestData.optString("resource_type");
        String name = requestData.optString("resource_name");
        String busId = requestData.optString("business_id");
        String amount = requestData.optString("resource_amount");
        UserAction action = new UserAction(serv, worker, "ADD RESOURCE " + name + " TYPE " + type);
        String[] propNames1 = new String[]{"ID", "BUSINESS_ID", "RESOURCE_NAME", "RESOURCE_TYPE", "RESOURCE_AMOUNT", "CREATED"};
        Object[] values1 = new Object[]{action.getActionID(), busId, name, type, amount, ((Long) System.currentTimeMillis()).toString()};
        Datastore.insert("EXPENSE_DATA", propNames1, values1);
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "update_product")
    public void updateProduct(Server serv, ClientWorker worker) throws ParseException {
        JSONObject requestData = worker.getRequestData();
        String prodId = requestData.optString("id");
        String productName = requestData.optString("product_name");
        String oldProductName = requestData.optString("old_product_name");
        String productQty = requestData.optString("product_quantity");
        String productCat = requestData.optString("product_category");
        String productSubCat = requestData.optString("product_sub_category");
        String productBp = requestData.optString("product_bp_unit_cost");
        String productSp = requestData.optString("product_sp_unit_cost");
        String productRlimit = requestData.optString("product_reminder_limit");
        String productEdate = requestData.optString("product_expiry_date") + " 00:00:00";
        String productNarr = requestData.optString("product_narration");
        String tax = requestData.optString("tax", "0");
        String comm = requestData.optString("commission", "0");
        String busId = requestData.optString("business_id");
        String bType = requestData.optString("business_type");
        String pProduct = requestData.optString("product_parent");
        String unitSize = requestData.optString("product_unit_size");
        productQty = pProduct.trim().length() > 0 ? "0" : productQty;
        String userName = worker.getSession().getAttribute("username").toString();

        String expDate = toTimestamp(productEdate);

        //check that we are not duplicating products
        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter2 = new FilterPredicate("PRODUCT_NAME", FilterOperator.EQUAL, productName);
        boolean exists = Datastore.getSingleEntity("PRODUCT_DATA", filter1, filter2) != null;
        if (exists && !oldProductName.equals(productName)) {
            worker.setResponseData("FAIL");
            worker.setReason("Product " + productName + " already exists");
            serv.messageToClient(worker);
        } else {
            try {
                UserAction action = new UserAction(serv, worker, "UPDATE PRODUCT " + productName);
                Filter filter3 = new FilterPredicate("ID", FilterOperator.EQUAL, prodId);
                Filter filter4 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);

                JSONObject productData = Datastore.entityToJSONArray(Datastore.getSingleEntity("PRODUCT_DATA", filter3, filter4));
                Double storedProductQty = Double.parseDouble(productData.optJSONArray("PRODUCT_QTY").optString(0));
                Double newProductQty = Double.parseDouble(productQty);
                String[] propNames = new String[]{"PRODUCT_NAME", "PRODUCT_QTY", "PRODUCT_CATEGORY", "PRODUCT_SUB_CATEGORY", "PRODUCT_PARENT",
                    "PRODUCT_UNIT_SIZE", "BP_UNIT_COST", "SP_UNIT_COST", "PRODUCT_REMIND_LIMIT", "PRODUCT_EXPIRY_DATE", "PRODUCT_NARRATION", "TAX", "COMMISSION"};
                Object[] values = new Object[]{productName, productQty, productCat, productSubCat, pProduct, unitSize, productBp, productSp,
                    productRlimit, expDate, productNarr, tax, comm};

                Datastore.updateSingleEntity("PRODUCT_DATA", propNames, values, filter3, filter4);
                if (storedProductQty > newProductQty) {
                    //reduction in stock
                    Double theQty = storedProductQty - newProductQty;
                    addStock(prodId, busId, theQty.toString(), productBp, productSp, 0, productNarr, "stock_out", bType, userName);
                } else if (newProductQty > storedProductQty) {
                    //increase in stock
                    Double theQty = newProductQty - storedProductQty;
                    addStock(prodId, busId, theQty.toString(), productBp, productSp, 1, productNarr, "stock_in", bType, userName);
                }
                action.saveAction();
                worker.setResponseData("SUCCESS");
                serv.messageToClient(worker);
            } catch (Exception ex) {
                Logger.getLogger(PosAdminService.class.getName()).log(Level.SEVERE, null, ex);
                worker.setResponseData("FAIL");
                serv.messageToClient(worker);
            }
        }

    }

    private void addStock(String prodId, String busId, String stockQty, String bPrice, String sPrice, Integer type, String narr, String tranFlag, String bType, String userName) {
        Double qty = Double.parseDouble(stockQty);
        Double price = Double.parseDouble(bPrice);
        Double price1 = Double.parseDouble(sPrice);
        Double costBp = qty * price;
        Double costSp = qty * price1;
        String transId = new UniqueRandom(50).nextMixedRandom();
        //specify profit also
        if (narr.equals("")) {
            if (type == 1) {
                narr = "New Stock"; //increase
            } else if (type == 0) {
                narr = "Old Stock Disposed"; //reduction 
            }
        }
        if (bType.equals("goods")) {
            String[] propNames1 = new String[]{"ID", "BUSINESS_ID", "PRODUCT_ID", "TRAN_TYPE", "STOCK_COST_BP",
                "STOCK_COST_SP", "STOCK_QTY", "PROFIT", "TRAN_FLAG", "NARRATION", "CREATED", "USER_NAME"};
            Object[] values1 = new Object[]{transId, busId, prodId, type.toString(), costBp.toString(),
                costSp.toString(), stockQty, "0", tranFlag, narr, timestamp(), userName};
            Datastore.insert("STOCK_DATA", propNames1, values1);
        }

    }

    @Endpoint(name = "supplier_and_product")
    public void supplierAndProduct(Server serv, ClientWorker worker) {
        JSONObject request = worker.getRequestData();
        String actionType = request.optString("action_type");
        String busId = request.optString("business_id");
        String supId = request.optString("supplier_id");
        String prodId = request.optString("product_id");
        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter2 = new FilterPredicate("SUPPLIER_ID", FilterOperator.EQUAL, supId);
        Filter filter3 = new FilterPredicate("PRODUCT_ID", FilterOperator.EQUAL, prodId);
        Object resp = null;
        if (actionType.equals("delete")) {
            Datastore.deleteMultipleEntities("PRODUCT_SUPPLIER_DATA", filter1, filter2);
            resp = Message.SUCCESS;
        } else if (actionType.equals("create")) {
            Entity en = Datastore.getSingleEntity("PRODUCT_SUPPLIER_DATA", filter1, filter2, filter3);
            if (en != null) {
                worker.setResponseData(Message.FAIL);
                worker.setReason("This supplier already exists");
                serv.messageToClient(worker);
                return;
            }
            String[] props = new String[]{"PRODUCT_ID", "BUSINESS_ID", "SUPPLIER_ID", "CREATED"};
            String[] values = new String[]{prodId, busId, supId, timestamp()};
            Datastore.insert("PRODUCT_SUPPLIER_DATA", props, values);
            resp = Message.SUCCESS;
        } else if (actionType.equals("fetch_all")) {
            //this is a relationship thing
            //i hate relationships
            //get the name of the supplier and account
            String[] sortProps = new String[]{"SUPPLIER_NAME", null};
            SortDirection[] dirs = new SortDirection[]{SortDirection.ASCENDING, null};
            resp = Datastore.entityToJSON(Datastore.twoWayJoin(
                    new String[]{"SUPPLIER_DATA", "PRODUCT_SUPPLIER_DATA"},
                    new String[]{"ID", "SUPPLIER_ID"},
                    sortProps, dirs, new Filter[]{}, new Filter[]{filter1, filter3}));
        }

        worker.setResponseData(resp);
        serv.messageToClient(worker);

    }

    @Endpoint(name = "supplier_account_transact")
    public void supplierAccount(Server serv, ClientWorker worker) throws Exception {
        JSONObject request = worker.getRequestData();
        String supId = request.optString("supplier_id");
        String prodId = request.optString("product_id");
        String busId = request.optString("business_id");
        String transAmount = request.optString("amount");
        String units = request.optString("units_received");
        String sp = request.optString("sp_per_unit");
        String entryType = request.optString("entry_type");
        String narr = request.optString("narration");
        String bType = request.optString("business_type");
        String userName = worker.getSession().getAttribute("username").toString();

        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter3 = new FilterPredicate("PRODUCT_ID", FilterOperator.EQUAL, prodId);
        JSONObject prodData = Datastore.entityToJSON(Datastore.getMultipleEntities("PRODUCT_DATA", filter1, filter3));
        Double productTotalqty = prodData.optJSONArray("PRODUCT_QTY").optDouble(0);
        Double newQty = productTotalqty;
        Double theUnits = Double.parseDouble(units);
        Double cost = bType.equals("goods") ? Double.parseDouble(sp) * theUnits : Double.parseDouble(transAmount);
        if (entryType.equals("1")) {
            //this is stock in
            newQty = productTotalqty + theUnits; //increase the quantity, we are receiving stock
        } else if (entryType.equals("0")) {
            //this is stock out
            if (theUnits > productTotalqty) {
                //we cannot return more than we have
                worker.setResponseData(Message.FAIL);
                worker.setReason("You cannot return more stock than you have to supplier");
                serv.messageToClient(worker);
                return;
            } else {
                newQty = productTotalqty - Double.parseDouble(units);
            }
        }
        String tranFlag = entryType.equals("1") ? "stock_in" : "stock_out";
        //stuff from suppliers, credit your account, debit suppliers account
        String[] props = new String[]{"SUPPLIER_ID", "BUSINESS_ID", "PRODUCT_ID", "TRANS_AMOUNT", "TRAN_TYPE", "UNITS", "NARRATION", "USER_NAME", "CREATED"};
        String[] values = new String[]{supId, busId, prodId, transAmount, entryType, units, narr, userName, timestamp()};
        Datastore.insert("SUPPLIER_ACCOUNT", props, values);

        Datastore.updateSingleEntity("PRODUCT_DATA", new String[]{"PRODUCT_QTY"}, new String[]{newQty.toString()}, filter1, filter3);
        //note this as a stock movement
        String transId = new UniqueRandom(50).nextMixedRandom();

        String[] propNames1 = new String[]{"ID", "BUSINESS_ID", "PRODUCT_ID", "TRAN_TYPE", "STOCK_COST_BP",
            "STOCK_COST_SP", "STOCK_QTY", "PROFIT", "TRAN_FLAG", "NARRATION", "CREATED", "USER_NAME"};
        Object[] values1 = new Object[]{transId, busId, prodId, entryType, transAmount, cost.toString(), units, "0", tranFlag, narr, "!NOW()", userName};
        Datastore.insert("STOCK_DATA", propNames1, values1);
        //stock in is an expense on our side so put a 0
        //stock out is a revenue or refund

        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "supplier_action")
    public void supplierAction(Server serv, ClientWorker worker) {
        JSONObject request = worker.getRequestData();
        String name = request.optString("supplier_name");
        String country = request.optString("country");
        String city = request.optString("city");
        String pAddress = request.optString("postal_address");
        String pNumber = request.optString("phone_number");
        String email = request.optString("email_address");
        String web = request.optString("company_website");
        String cName = request.optString("contact_person_name");
        String cPhone = request.optString("contact_person_phone");
        String oldSupplierName = request.optString("old_supplier_name");

        String actionType = request.optString("action_type");
        String currentBusId = request.optString("business_id");
        String supId = request.optString("supplier_id");

        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, currentBusId);
        Filter filter2 = new FilterPredicate("SUPPLIER_NAME", FilterOperator.EQUAL, name);
        Filter filter3 = new FilterPredicate("ID", FilterOperator.EQUAL, supId);
        Entity en = Datastore.getSingleEntity("SUPPLIER_DATA", filter1, filter2);
        if (en != null && actionType.equals("create")) {
            worker.setResponseData(Message.FAIL);
            worker.setReason("Supplier " + name + " already exists");
            serv.messageToClient(worker);
            return;
        } else if (en != null && !oldSupplierName.equals(name) && actionType.equals("update")) {
            worker.setResponseData(Message.FAIL);
            worker.setReason("Supplier " + name + " already exists");
            serv.messageToClient(worker);
            return;
        } else {
            if (actionType.equals("create")) {
                UniqueRandom rand = new UniqueRandom(10);
                supId = rand.nextMixedRandom();
                String[] props = new String[]{"ID", "BUSINESS_ID", "SUPPLIER_NAME", "COUNTRY", "CITY", "POSTAL_ADDRESS", "PHONE_NUMBER", "EMAIL_ADDRESS",
                    "WEBSITE", "CONTACT_PERSON_NAME", "CONTACT_PERSON_PHONE", "CREATED"};
                String[] values = new String[]{supId, currentBusId, name, country, city,
                    pAddress, pNumber, email, web, cName, cPhone, timestamp()};
                Datastore.insert("SUPPLIER_DATA", props, values);
            } else if (actionType.equals("update")) {
                String[] props = new String[]{"SUPPLIER_NAME", "COUNTRY", "CITY", "POSTAL_ADDRESS", "PHONE_NUMBER", "EMAIL_ADDRESS",
                    "WEBSITE", "CONTACT_PERSON_NAME", "CONTACT_PERSON_PHONE"};
                String[] values = new String[]{name, country, city, pAddress, pNumber, email, web, cName, cPhone};
                Datastore.updateSingleEntity("SUPPLIER_DATA", props, values, filter1, filter3);
            } else if (actionType.equals("delete")) {
                Datastore.deleteSingleEntity("SUPPLIER_DATA", filter3);
            }
        }
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "create_product")
    public void createProduct(Server serv, ClientWorker worker) throws ParseException {
        JSONObject requestData = worker.getRequestData();
        String productName = requestData.optString("product_name");
        String productQty = requestData.optString("product_quantity");
        String productCat = requestData.optString("product_category");
        String productSubCat = requestData.optString("product_sub_category");
        String productBp = requestData.optString("product_bp_unit_cost");
        String productSp = requestData.optString("product_sp_unit_cost");
        String productRlimit = requestData.optString("product_reminder_limit");
        String productEdate = requestData.optString("product_expiry_date") + " 00:00:00";
        String productNarr = requestData.optString("product_narration");
        String tax = requestData.optString("tax", "0");
        String comm = requestData.optString("commission", "0");
        String busId = requestData.optString("business_id");
        String bType = requestData.optString("business_type");
        String pProduct = requestData.optString("product_parent");
        String unitSize = requestData.optString("product_unit_size");
        productQty = pProduct.trim().length() > 0 ? "0" : productQty;
        String userName = worker.getSession().getAttribute("username").toString();
        //check whether the product exists

        String expDate = toTimestamp(productEdate);
        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter2 = new FilterPredicate("PRODUCT_NAME", FilterOperator.EQUAL, productName);
        boolean exists = Datastore.getSingleEntity("PRODUCT_DATA", filter1, filter2) != null;
        Integer count = Datastore.getMultipleEntitiesAsList("PRODUCT_DATA",filter1).size();
        count++;
        if (exists) {
            worker.setResponseData("FAIL");
            worker.setReason("Product " + productName + " already exists");
            serv.messageToClient(worker);
        } else {
            try {
                //well create the product

                UserAction action = new UserAction(serv, worker, "CREATE PRODUCT " + productName);
                String prodId = new UniqueRandom(10).nextMixedRandom();
                String[] propNames1 = new String[]{"ID", "BUSINESS_ID", "PRODUCT_NAME","PRODUCT_CODE", "PRODUCT_QTY", "PRODUCT_CATEGORY", "PRODUCT_SUB_CATEGORY", "PRODUCT_PARENT",
                    "PRODUCT_UNIT_SIZE", "BP_UNIT_COST", "SP_UNIT_COST", "PRODUCT_REMIND_LIMIT", "PRODUCT_EXPIRY_DATE", "PRODUCT_NARRATION", "TAX",
                    "COMMISSION", "ACTION_ID", "CREATED"};
                Object[] values1 = new Object[]{prodId, busId, productName,count.toString(), productQty, productCat, productSubCat, pProduct, unitSize,
                    productBp, productSp, productRlimit, expDate, productNarr, tax, comm, action.getActionID(), timestamp()};

                Datastore.insert("PRODUCT_DATA", propNames1, values1);
                addStock(prodId, busId, productQty, productBp, productSp, 1, productNarr, "new_stock", bType, userName);
                action.saveAction();
                worker.setResponseData("SUCCESS");
                serv.messageToClient(worker);
            } catch (Exception ex) {
                Logger.getLogger(PosAdminService.class.getName()).log(Level.SEVERE, null, ex);
                worker.setResponseData("FAIL");
                serv.messageToClient(worker);
            }
        }

    }

    private String toTimestamp(String date) throws ParseException {
        SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd hh:mm:ss");
        Long times = dateFormat.parse(date).getTime();
        return times.toString();
    }

    private String timestamp() {
        return ((Long) System.currentTimeMillis()).toString();
    }

    @Endpoint(name = "delete_product")
    public void deleteProduct(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String id = requestData.optString("id");
        String busId = requestData.optString("business_id");
        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter2 = new FilterPredicate("ID", FilterOperator.EQUAL, id);
        Datastore.deleteSingleEntity("PRODUCT_DATA", filter1, filter2);
        worker.setResponseData("SUCCESS");
        serv.messageToClient(worker);
    }

    @Endpoint(name = "all_products", shareMethodWith = {"pos_sale_service", "pos_middle_service"},
            cacheModifiers = {"pos_admin_service_create_product","pos_admin_service_update_product"
                    ,"pos_admin_service_delete_product"})//"pos_sale_service_transact","pos_admin_service_transact"
    public void allProducts(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String cat = requestData.optString("category");
        String busId = requestData.optString("business_id");
        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("PRODUCT_CATEGORY", FilterOperator.EQUAL, cat);
        JSONObject data;
        if (cat != null && !cat.isEmpty() && !cat.equals("all")) {
            data = Datastore.entityToJSON(
                    Datastore.getMultipleEntities("PRODUCT_DATA", "PRODUCT_NAME", SortDirection.ASCENDING, filter, filter1));
        } else {
            data = Datastore.entityToJSON(
                    Datastore.getMultipleEntities("PRODUCT_DATA", "PRODUCT_NAME", SortDirection.ASCENDING, filter));
        }
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }

    private void updateProductQty(ClientWorker worker, String prodId) {
        JSONObject request = worker.getRequestData();
        String busId = request.optString("business_id");
        String bType = request.optString("business_type");
        String productQty = request.optString("new_value");
        String userName = worker.getSession().getAttribute("username").toString();

        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("ID", FilterOperator.EQUAL, prodId);

        JSONObject productData = Datastore.entityToJSON(
                Datastore.getMultipleEntities("PRODUCT_DATA", filter, filter1));

        Double storedProductQty = Double.parseDouble(productData.optJSONArray("PRODUCT_QTY").optString(0));
        String productBp = productData.optJSONArray("BP_UNIT_COST").optString(0);
        String productSp = productData.optJSONArray("SP_UNIT_COST").optString(0);
        Double newProductQty = Double.parseDouble(productQty);
        if (storedProductQty > newProductQty) {
            //reduction in stock
            Double theQty = storedProductQty - newProductQty;
            addStock(prodId, busId, theQty.toString(), productBp, productSp, 0, "", "stock_out", bType, userName);
            Datastore.updateSingleEntity("PRODUCT_DATA", new String[]{"PRODUCT_QTY"}, new String[]{newProductQty.toString()}, filter, filter1);
        } else if (newProductQty > storedProductQty) {
            //increase in stock
            Double theQty = newProductQty - storedProductQty;
            addStock(prodId, busId, theQty.toString(), productBp, productSp, 1, "", "stock_in", bType, userName);
            Datastore.updateSingleEntity("PRODUCT_DATA", new String[]{"PRODUCT_QTY"}, new String[]{newProductQty.toString()}, filter, filter1);
        }
    }

    @Endpoint(name = "save_grid_edit")
    public void saveGridEdit(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String column = requestData.optString("column").trim();
        String id = requestData.optString("id");
        String newValue = requestData.optString("new_value");
        String busId = requestData.optString("business_id");
        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("ID", FilterOperator.EQUAL, id);

        if (column.equals("PRODUCT_QTY")) {
            updateProductQty(worker, id);
        } else {
            Datastore.updateSingleEntity("PRODUCT_DATA", new String[]{column}, new String[]{newValue}, filter, filter1);
        }
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "all_suppliers", shareMethodWith = {"pos_middle_service"})
    public void allSuppliers(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String busId = requestData.optString("business_id");
        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        JSONObject data = Datastore.entityToJSON(
                Datastore.getMultipleEntities("SUPPLIER_DATA", "SUPPLIER_NAME", SortDirection.ASCENDING, filter));
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "all_users", shareMethodWith = {"pos_sale_service"})
    public void allUsers(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String busId = requestData.optString("business_id");
        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        JSONObject data = Datastore.entityToJSON(Datastore.getMultipleEntities("BUSINESS_USERS", filter));
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "auto_complete", shareMethodWith = {"pos_sale_service"})
    public void autoComplete(Server serv, ClientWorker worker) {
        try {
            JSONObject requestData = worker.getRequestData();
            String entity = requestData.optString("entity");
            JSONArray columns = requestData.optJSONArray("column");
            int limit = requestData.optInt("limit");
            String orderBy = requestData.optString("orderby");
            String orderDir = requestData.optString("order_direction");
            String busId = requestData.optString("business_id");
            JSONArray whereCols = requestData.optJSONArray("where_cols");
            JSONArray whereValues = requestData.optJSONArray("where_values");
            JSONArray whereOps = requestData.optJSONArray("where_operators");
            boolean isSafe = serv.isEntitySafe(entity, columns); //USERS, [USER_NAME,REAL_NAME]
            if (!isSafe) {
                worker.setReason("Access denied: specified query not allowed");
                worker.setResponseData("FAIL");
                serv.messageToClient(worker);
                return;
            }

            //SortDirection sd = orderDir.equals("ASC") ? SortDirection.ASCENDING : SortDirection.DESCENDING;
            ArrayList<Filter> aFilters = new ArrayList<Filter>();
            for (int x = 0; x < whereCols.length(); x++) {
                String col = whereCols.optString(x);
                String value = whereValues.optString(x);
                String operator = whereOps.optString(x);
                Filter filter = new FilterPredicate(col, Datastore.getFilterOperator(operator), value);
                aFilters.add(filter);
            }
            Filter busFilter = new FilterPredicate("BUSINESS_ID", Datastore.getFilterOperator("="), busId);
            aFilters.add(busFilter);
            
            Filter[] filters = new Filter[aFilters.size()];
            filters = aFilters.toArray(filters);
            JSONObject data = Datastore.entityToJSON(Datastore.getMultipleEntities(entity,FetchOptions.Builder.withLimit(limit), filters));
            
//            JSONArray busIds = data.optJSONArray("BUSINESS_ID");
//            if (busIds != null) {
//                for (int x = 0; x < busIds.length(); x++) {
//                    String id = busIds.optString(x);
//                    if (!id.equals(busId)) {
//                        data.optJSONArray("BUSINESS_ID").put(x, null);
//                        Iterator<String> iter = data.keys();
//                        while (iter.hasNext()) {
//                            String key = iter.next();
//                            data.optJSONArray(key).put(x, null);
//                        }
//                    }
//                }
//            }
            worker.setResponseData(data);
            serv.messageToClient(worker);
        } catch (Exception ex) {
            Logger.getLogger(PosAdminService.class.getName()).log(Level.SEVERE, null, ex);
            worker.setResponseData("FAIL");
            serv.messageToClient(worker);
        }

    }

    @Endpoint(name = "stock_history", shareMethodWith = {"pos_sale_service", "pos_middle_service"})
    public void openStockHistory(Server serv, ClientWorker worker) throws ParseException {
        JSONObject requestData = worker.getRequestData();
        String action = requestData.optString("report_type");
        if (action.equals("stock_history")) {
            stockHistory(serv, worker);
        } else if (action.equals("commission_history")) {
            commissionHistory(serv, worker);
        } else if (action.equals("tax_history")) {
            taxHistory(serv, worker);
        } else if (action.equals("supplier_history")) {
            supplierHistory(serv, worker);
        }
    }

    private void supplierHistory(Server serv, ClientWorker worker) throws ParseException {
        JSONObject requestData = worker.getRequestData();
        String beginDate = requestData.optString("begin_date");
        String endDate = requestData.optString("end_date");
        String prodId = requestData.optString("id");
        String userName = requestData.optString("user_name");
        String busId = requestData.optString("business_id");
        String supId = requestData.optString("supplier_id");

        String lbeginDate = toTimestamp(beginDate);
        String lendDate = toTimestamp(endDate);

        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("CREATED", FilterOperator.GREATER_THAN_OR_EQUAL, lbeginDate);
        Filter filter2 = new FilterPredicate("CREATED", FilterOperator.LESS_THAN_OR_EQUAL, lendDate);
        Filter filter3 = new FilterPredicate("USER_NAME", FilterOperator.EQUAL, userName);
        Filter filter4 = new FilterPredicate("PRODUCT_ID", FilterOperator.EQUAL, prodId);
        Filter filter5 = new FilterPredicate("SUPPLIER_ID", FilterOperator.EQUAL, supId);

        Filter extraFilter = userName.equals("all") ? filter : filter3;
        Filter extraFilter1 = supId.equals("all") ? filter : filter5;
        Filter extraFilter2 = prodId.equals("all") ? filter : filter4;

        String[] entityNames = new String[]{"SUPPLIER_ACCOUNT", "PRODUCT_DATA", "SUPPLIER_ACCOUNT", "SUPPLIER_DATA"};
        String[] joinProps = new String[]{"PRODUCT_ID", "ID", "SUPPLIER_ID", "ID"};
        String[] sortProps = new String[]{null, null, null, null};
        SortDirection[] dirs = new SortDirection[]{null, null, null, null};
        Filter[][] filters = new Filter[][]{
            new Filter[]{filter1, filter2, filter, extraFilter, extraFilter1, extraFilter2},
            new Filter[]{},
            new Filter[]{filter1, filter2, filter, extraFilter, extraFilter1, extraFilter2},
            new Filter[]{}};

        JSONObject data = Datastore.entityToJSON(Datastore.multiJoin(entityNames, joinProps, sortProps, dirs, filters));
        worker.setResponseData(data);
        serv.messageToClient(worker);

    }

    private void commissionHistory(Server serv, ClientWorker worker) throws ParseException {
        JSONObject requestData = worker.getRequestData();
        String beginDate = requestData.optString("begin_date");
        String endDate = requestData.optString("end_date");
        String prodId = requestData.optString("id");
        String userName = requestData.optString("user_name");
        String busId = requestData.optString("business_id");

        String lbeginDate = toTimestamp(beginDate);
        String lendDate = toTimestamp(endDate);

        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("CREATED", FilterOperator.GREATER_THAN_OR_EQUAL, lbeginDate);
        Filter filter2 = new FilterPredicate("CREATED", FilterOperator.LESS_THAN_OR_EQUAL, lendDate);
        Filter filter3 = new FilterPredicate("USER_NAME", FilterOperator.EQUAL, userName);
        Filter filter4 = new FilterPredicate("PRODUCT_ID", FilterOperator.EQUAL, prodId);
        Filter extraFilter = userName.equals("all") ? filter : filter3;

        String[] sortProps = new String[]{null, "CREATED"};
        SortDirection[] dirs = new SortDirection[]{null, SortDirection.DESCENDING};

        JSONObject data;
        String[] entityNames = new String[]{"PRODUCT_DATA", "COMMISSION_DATA"};
        String[] joinProps = new String[]{"ID", "PRODUCT_ID"};
        if (prodId.equals("all")) {
            data = Datastore.entityToJSON(
                    Datastore.twoWayJoin(entityNames, joinProps, sortProps, dirs,
                            new Filter[]{},
                            new Filter[]{filter, filter1, filter2, extraFilter}));
        } else {
            data = Datastore.entityToJSON(
                    Datastore.twoWayJoin(entityNames, joinProps, sortProps, dirs,
                            new Filter[]{},
                            new Filter[]{filter, filter1, filter2, filter4, extraFilter}));
        }
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }

    private void taxHistory(Server serv, ClientWorker worker) throws ParseException {
        JSONObject requestData = worker.getRequestData();
        String beginDate = requestData.optString("begin_date");
        String endDate = requestData.optString("end_date");
        String prodId = requestData.optString("id");
        String userName = requestData.optString("user_name");
        String busId = requestData.optString("business_id");

        String lbeginDate = toTimestamp(beginDate);
        String lendDate = toTimestamp(endDate);

        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("CREATED", FilterOperator.GREATER_THAN_OR_EQUAL, lbeginDate);
        Filter filter2 = new FilterPredicate("CREATED", FilterOperator.LESS_THAN_OR_EQUAL, lendDate);
        Filter filter3 = new FilterPredicate("USER_NAME", FilterOperator.EQUAL, userName);
        Filter filter4 = new FilterPredicate("PRODUCT_ID", FilterOperator.EQUAL, prodId);
        Filter extraFilter = userName.equals("all") ? filter : filter3;

        String[] sortProps = new String[]{null, "CREATED"};
        SortDirection[] dirs = new SortDirection[]{null, SortDirection.DESCENDING};

        JSONObject data;
        String[] entityNames = new String[]{"PRODUCT_DATA", "TAX_DATA"};
        String[] joinProps = new String[]{"ID", "PRODUCT_ID"};
        if (prodId.equals("all")) {
            data = Datastore.entityToJSON(
                    Datastore.twoWayJoin(entityNames, joinProps, sortProps, dirs,
                            new Filter[]{},
                            new Filter[]{filter, filter1, filter2, extraFilter}));
        } else {
            data = Datastore.entityToJSON(
                    Datastore.twoWayJoin(entityNames, joinProps, sortProps, dirs,
                            new Filter[]{},
                            new Filter[]{filter, filter1, filter2, filter4, extraFilter}));
        }
        worker.setResponseData(data);
        serv.messageToClient(worker);

    }

    private String getDate() {
        Calendar cal = Calendar.getInstance();
        int year = cal.get(Calendar.YEAR);
        Integer month = cal.get(Calendar.MONTH) + 1;
        Integer day = cal.get(Calendar.DATE);
        String themonth = month < 10 ? "0" + month : month.toString();
        String theday = day < 10 ? "0" + day : day.toString();
        return year + "-" + themonth + "-" + theday;
    }

    private String getTodayBeginDate() {
        return getDate() + " 00:00:00";
    }

    private String getTodayEndDate() {
        return getDate() + " 23:59:59";
    }

    private void stockHistory(Server serv, ClientWorker worker) throws ParseException {
        JSONObject requestData = worker.getRequestData();
        String beginDate = requestData.optString("begin_date");
        beginDate = beginDate.equals("server_time_begin") ? getTodayBeginDate() : beginDate;
        String endDate = requestData.optString("end_date");
        endDate = endDate.equals("server_time_end") ? getTodayEndDate() : endDate;

        String lbeginDate = toTimestamp(beginDate);
        String lendDate = toTimestamp(endDate);

        String prodId = requestData.optString("id");
        String userName = requestData.optString("user_name");
        String busId = requestData.optString("business_id");
        String category = requestData.optString("product_categories");
        //what we need
        //stock_id, stock name,stock_bp, stock_sp,stock_qty, profit,type,narr,date,initiator
        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("CREATED", FilterOperator.GREATER_THAN_OR_EQUAL, lbeginDate);
        Filter filter2 = new FilterPredicate("CREATED", FilterOperator.LESS_THAN_OR_EQUAL, lendDate);
        Filter filter3 = new FilterPredicate("USER_NAME", FilterOperator.EQUAL, userName);
        Filter filter4 = new FilterPredicate("PRODUCT_ID", FilterOperator.EQUAL, prodId);
        Filter filter5 = new FilterPredicate("PRODUCT_CATEGORY", FilterOperator.EQUAL, category);

        Filter extraFilter = userName.equals("all") ? filter : filter3;
        Filter extraFilter1 = category.equals("all") ? filter : filter5;

        String[] sortProps = new String[]{"CREATED", null};
        SortDirection[] dirs = new SortDirection[]{SortDirection.DESCENDING, null};
        JSONObject data;
        if (prodId.equals("all")) {
            String[] entityNames = new String[]{"STOCK_DATA", "PRODUCT_DATA"};
            String[] joinProps = new String[]{"PRODUCT_ID", "ID"};
            data = Datastore.entityToJSON(
                    Datastore.twoWayJoin(entityNames, joinProps, sortProps, dirs,
                            new Filter[]{filter, filter1, filter2, extraFilter},
                            new Filter[]{extraFilter1}));
        } else {
            String[] entityNames = new String[]{"STOCK_DATA", "PRODUCT_DATA"};
            String[] joinProps = new String[]{"PRODUCT_ID", "ID"};
            data = Datastore.entityToJSON(Datastore.twoWayJoin(entityNames, joinProps, sortProps, dirs,
                    new Filter[]{filter, filter1, filter2, extraFilter, filter4}, new Filter[]{extraFilter1}));
        }

        worker.setResponseData(data);
        serv.messageToClient(worker);

    }

    private JSONObject getAccountBalance(ClientWorker worker, String entity, String column) throws JSONException, ParseException {
        //get the amount of taxes or commissions earned for the specified period
        JSONObject requestData = worker.getRequestData();
        String beginDate = requestData.optString("start_date") + " 00:00:00";
        String busId = requestData.optString("business_id");
        String endDate = requestData.optString("end_date") + " 23:59:59";

        String lbeginDate = toTimestamp(beginDate);
        String lendDate = toTimestamp(endDate);

        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("CREATED", FilterOperator.GREATER_THAN_OR_EQUAL, lbeginDate);
        Filter filter2 = new FilterPredicate("CREATED", FilterOperator.LESS_THAN_OR_EQUAL, lendDate);

        JSONObject data = Datastore.entityToJSON(Datastore.getMultipleEntities(entity, filter, filter1, filter2));
        JSONArray col = data.optJSONArray(column);
        double total = 0;
        if(col != null){
            for (int x = 0; x < col.length(); x++) {
                double value = col.optDouble(x, 0);
                total += value;
            }
        }
        String resourceName = "auto expense";
        if (entity.equals("COMMISSION_DATA")) {
            resourceName = "Commissions";
        } else if (entity.equals("TAX_DATA")) {
            resourceName = "Taxes";
        }
        JSONObject obj = new JSONObject();
        obj.put("ID", new UniqueRandom(60).nextMixedRandom());
        obj.put("BUSINESS_ID", busId);
        obj.put("RESOURCE_NAME", resourceName);
        obj.put("RESOURCE_TYPE", "expense");
        obj.put("RESOURCE_AMOUNT", total);
        obj.put("CREATED", new Date());
        return obj;
    }

    private JSONObject mapToJSONArrays(JSONObject mapTo, JSONObject toMap) {
        Iterator<String> iter = toMap.keys();
        while (iter.hasNext()) {
            String key = iter.next();
            Object value = toMap.opt(key);
            mapTo.optJSONArray(key).put(value);
        }
        return mapTo;
    }

    private JSONObject generateExpensesAndIncomes(ClientWorker worker) throws JSONException, ParseException {
        JSONObject requestData = worker.getRequestData();
        String beginDate = requestData.optString("start_date") + " 00:00:00";
        String busId = requestData.optString("business_id");
        String endDate = requestData.optString("end_date") + " 23:59:59";

        String lbeginDate = toTimestamp(beginDate);
        String lendDate = toTimestamp(endDate);

        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("CREATED", FilterOperator.GREATER_THAN_OR_EQUAL, lbeginDate);
        Filter filter2 = new FilterPredicate("CREATED", FilterOperator.LESS_THAN_OR_EQUAL, lendDate);

        JSONObject expData = Datastore.entityToJSON(
                Datastore.getMultipleEntities("EXPENSE_DATA", filter, filter1, filter2));

        JSONObject settings = Datastore.entityToJSON(Datastore.getAllEntities("CONF_DATA"));
        int commIndex = settings.optJSONArray("CONF_KEY").toList().indexOf("add_comm");
        int taxIndex = settings.optJSONArray("CONF_KEY").toList().indexOf("add_tax");

        String hasTax = taxIndex == -1 ? "0" : settings.optJSONArray("CONF_VALUE").toList().get(taxIndex).toString();
        String hasComm = commIndex == -1 ? "0" : settings.optJSONArray("CONF_VALUE").toList().get(commIndex).toString();

        JSONObject comm = getAccountBalance(worker, "COMMISSION_DATA", "COMM_VALUE");
        JSONObject tax = getAccountBalance(worker, "TAX_DATA", "TAX_VALUE");

        if (hasTax.equals("1")) {
            expData = mapToJSONArrays(expData, tax);
        }

        if (hasComm.equals("1")) {
            expData = mapToJSONArrays(expData, comm);
        }

        return expData;
    }

    @Endpoint(name = "profit_and_loss")
    public void profitAndLoss(Server serv, ClientWorker worker) throws JSONException, ParseException {
        JSONObject requestData = worker.getRequestData();
        String beginDate = requestData.optString("start_date") + " 00:00:00";
        String busId = requestData.optString("business_id");
        String endDate = requestData.optString("end_date") + " 23:59:59";
        String bType = requestData.optString("business_type");

        Float costOfGoodsBought = 0F;
        Float costOfGoodsSold = 0F;
        Float costOfSales = 0F;

        String lbeginDate = toTimestamp(beginDate);
        String lendDate = toTimestamp(endDate);

        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter1 = new FilterPredicate("CREATED", FilterOperator.GREATER_THAN_OR_EQUAL, lbeginDate);
        Filter filter2 = new FilterPredicate("CREATED", FilterOperator.LESS_THAN_OR_EQUAL, lendDate);

        JSONObject data = Datastore.entityToJSON(Datastore.getMultipleEntities("STOCK_DATA", filter, filter1, filter2));
        JSONObject expData = generateExpensesAndIncomes(worker);

        JSONArray goods = data.optJSONArray("STOCK_COST_BP");
        JSONArray sales = data.optJSONArray("STOCK_COST_SP");
        JSONArray flags = data.optJSONArray("TRAN_FLAG");
        //opening stock, cost of goods, closing stock
        //cost of sales
        if(goods != null){
        for (int x = 0; x < goods.length(); x++) {
            Float amountBP = Float.parseFloat(goods.optString(x));
            Float amountSP = Float.parseFloat(sales.optString(x));
            String flag = flags.optString(x);
            //flags can be stock_in, reversal_of_sale, old_stock_disposed
            float dummy = flag.equals("stock_in") ? costOfGoodsBought = costOfGoodsBought + amountBP : 0; //goods we bought
            dummy = flag.equals("stock_out") ? costOfGoodsBought = costOfGoodsBought - amountBP : 0; //goods we bought
            dummy = flag.equals("sale_to_customer") ? costOfGoodsSold = costOfGoodsSold + amountBP : 0; //goods we bought
            dummy = flag.equals("sale_to_customer") ? costOfSales = costOfSales + amountSP : 0; //goods we sold
        }
        }

        JSONObject prodData = Datastore.entityToJSON(Datastore.getMultipleEntities("PRODUCT_DATA", filter));
        JSONArray qtys = prodData.optJSONArray("PRODUCT_QTY");
        JSONArray priceBPs = prodData.optJSONArray("BP_UNIT_COST");
        Double closingStock = 0d;
        Double openingStock = 0d;
        if (bType.equals("goods")) {
            if(qtys != null){
            for (int x = 0; x < qtys.length(); x++) {
                int qty = qtys.optInt(x);
                Double priceBP = priceBPs.optDouble(x);
                closingStock += qty * priceBP;
            }
            }
            openingStock = closingStock + costOfGoodsSold - costOfGoodsBought;
        } else if (bType.equals("services")) {
            openingStock = 0d;
        }

        //from product data extract
        JSONObject response = new JSONObject();
        response.put("resource_data", expData);
        response.put("cost_of_goods_sold_sp", costOfSales); //sales
        response.put("cost_of_goods_sold_bp", costOfGoodsSold);
        response.put("cost_of_goods_bought_bp", costOfGoodsBought); //purchases
        response.put("closing_stock", closingStock);
        response.put("opening_stock", openingStock);
        worker.setResponseData(response);
        serv.messageToClient(worker);
        //we have the data here, we need cost of sales, cost of goods,goods unsold expenses and incomes
    }

    @Endpoint(name = "stock_expiry", shareMethodWith = {"pos_sale_service"})
    public void stockExpiry(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String busId = requestData.optString("business_id");
        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);

        Filter filter1 = new FilterPredicate("PRODUCT_EXPIRY_DATE", FilterOperator.LESS_THAN, ((Long) System.currentTimeMillis()).toString());
        Iterable<Entity> entities = Datastore.getMultipleEntities("PRODUCT_DATA", "PRODUCT_EXPIRY_DATE", SortDirection.ASCENDING, filter, filter1);
        JSONObject data = Datastore.entityToJSON(entities);
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "stock_low", shareMethodWith = {"pos_sale_service"})
    public void stockLow(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String busId = requestData.optString("business_id");
        //do a lot of cool stuff

        Filter filter = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        JSONObject data = Datastore.entityToJSON(Datastore.compareQuery("PRODUCT_DATA", "PRODUCT_QTY", "<=", "PRODUCT_REMIND_LIMIT", filter));
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "delete_business")
    public void deleteBusinessData(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String busId = requestData.optString("business_id");
        String owner = requestData.optString("business_owner");
        Filter filter = new FilterPredicate("BUSINESS_OWNER", FilterOperator.EQUAL, owner);
        List list = Datastore.getMultipleEntitiesAsList("BUSINESS_DATA", filter);
        int businesses = list.size();
        if (businesses < 2) {
            worker.setResponseData(Message.FAIL);
            worker.setReason("You cannot delete the only business you have");
            serv.messageToClient(worker);
            return;
        }
        //delete all data associated with this business
        Datastore.deleteMultipleEntities("EXPENSE_DATA", "BUSINESS_ID", busId, FilterOperator.EQUAL);
        Datastore.deleteMultipleEntities("STOCK_DATA", "BUSINESS_ID", busId, FilterOperator.EQUAL);
        Datastore.deleteMultipleEntities("PRODUCT_DATA", "BUSINESS_ID", busId, FilterOperator.EQUAL);
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
    }
    
    @Endpoint(name = "product_categories", shareMethodWith = {"pos_sale_service", "pos_middle_service"},
            cacheModifiers = {"pos_admin_service_create_product","pos_admin_service_update_product","pos_admin_service_delete_product"})
    public void loadCategories(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String catType = requestData.optString("category_type");
        String filter = requestData.optString("filter");
        String busId = requestData.optString("business_id");
        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter2 = new FilterPredicate("PRODUCT_CATEGORY", FilterOperator.EQUAL, filter);
        JSONObject data = new JSONObject();
        if (catType.equals("category")) {
            Query q = new Query("PRODUCT_DATA");
            q.addProjection(new PropertyProjection("PRODUCT_CATEGORY", String.class));
            q.addSort("PRODUCT_CATEGORY",SortDirection.ASCENDING);
            q.setFilter(filter1);
            q.setDistinct(true);
            data = Datastore.entityToJSON(Datastore.getEntities(q));
        } else if (catType.equals("sub_category")) {
            Query q = new Query("PRODUCT_DATA");
            q.addProjection(new PropertyProjection("PRODUCT_SUB_CATEGORY", String.class));
            q.addSort("PRODUCT_SUB_CATEGORY", SortDirection.ASCENDING);
            q.setFilter(Query.CompositeFilterOperator.and(filter1,filter2));
            q.setDistinct(true);
            data = Datastore.entityToJSON(Datastore.getEntities(q));
        }
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "load_products", shareMethodWith = {"pos_sale_service", "pos_middle_service"},
            cacheModifiers = {"pos_admin_service_create_product","pos_admin_service_update_product",
                "pos_admin_service_delete_product"}) //"pos_sale_service_transact","pos_admin_service_transact"
    public void loadProducts(Server serv, ClientWorker worker) throws JSONException {
        JSONObject requestData = worker.getRequestData();
        String cat = requestData.optString("category");
        String subCat = requestData.optString("sub_category");
        String busId = requestData.optString("business_id");
        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter2 = new FilterPredicate("PRODUCT_CATEGORY", FilterOperator.EQUAL, cat);
        Filter filter3 = new FilterPredicate("PRODUCT_SUB_CATEGORY", FilterOperator.EQUAL, subCat);
        JSONObject data = Datastore.entityToJSON(
                Datastore.getMultipleEntities("PRODUCT_DATA", "PRODUCT_NAME", SortDirection.ASCENDING, filter1,filter2,filter3));
        JSONObject allProds = Datastore.entityToJSON(
                Datastore.getMultipleEntities("PRODUCT_DATA", filter1));
        JSONObject all = new JSONObject();
        all.put("categorized_products", data);
        all.put("all_products", allProds);
        worker.setResponseData(all);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "fetch_item_by_id", shareMethodWith = {"pos_sale_service", "pos_middle_service"})
    public void fetchItemById(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String entity = requestData.optString("entity");
        JSONArray columns = requestData.optJSONArray("columns");
        JSONArray whereCols = requestData.optJSONArray("where_cols");
        JSONArray whereValues = requestData.optJSONArray("where_values");
        String busId = requestData.optString("business_id");
        boolean isSafe = serv.isEntitySafe(entity,columns);
        if (isSafe) {
            Filter [] filters = new Filter[whereCols.length() + 1];
            PropertyProjection[] projections = new PropertyProjection[columns.length()];
            for(int x = 0; x < filters.length; x++){
               filters[x] = new FilterPredicate(whereCols.optString(x), FilterOperator.EQUAL, whereValues.optString(x));
            }
            for(int x = 0; x < projections.length; x++){
                projections[x] = new PropertyProjection(columns.optString(x), String.class);
            }
            filters[filters.length - 1] =  new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
            JSONObject data = Datastore.entityToJSON(Datastore.getMultipleEntities(entity,projections, filters));
            worker.setResponseData(data);
            serv.messageToClient(worker);
        } else {
            worker.setResponseData(Message.FAIL);
            worker.setReason("Specified query is not allowed");
            serv.messageToClient(worker);
        }
    }

    @Endpoint(name = "add_category")
    public void addCategory(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String cat = requestData.optString("category");
        String username = requestData.optString("username");
        String busId = requestData.optString("business_id");
        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter2 = new FilterPredicate("USER_NAME", FilterOperator.EQUAL, username);
        Filter filter3 = new FilterPredicate("CATEGORY", FilterOperator.EQUAL, cat);
        Entity en = Datastore.getSingleEntity("USER_CATEGORIES", filter1,filter2,filter3);
        
        if (en != null) {
            worker.setResponseData(Message.FAIL);
            worker.setReason("Category already exists");
            serv.messageToClient(worker);
        } else {
            if (cat.equals("all")) {
                Datastore.deleteMultipleEntities("USER_CATEGORIES", filter1,filter2);
            } else {
                Filter filter4 = new FilterPredicate("CATEGORY", FilterOperator.EQUAL, "all");
                Datastore.deleteMultipleEntities("USER_CATEGORIES", filter1,filter2,filter4);
            }
            Datastore.insert("USER_CATEGORIES",
                    new String[]{"BUSINESS_ID","USER_NAME","CATEGORY","CREATED"}, 
                    new String[]{busId,username,cat,timestamp()});
            worker.setResponseData(Message.SUCCESS);
            serv.messageToClient(worker);
        }

    }

    @Endpoint(name = "fetch_categories", shareMethodWith = {"pos_sale_service", "pos_middle_service"})
    public void fetchCategories(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String username = requestData.optString("username");
        String busId = requestData.optString("business_id");
        Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
        Filter filter2 = new FilterPredicate("USER_NAME", FilterOperator.EQUAL, username);
        JSONObject data = Datastore.entityToJSON(
                Datastore.getMultipleEntities("USER_CATEGORIES", filter1,filter2));
        worker.setResponseData(data);
        serv.messageToClient(worker);
    }

    @Endpoint(name = "note_cash_received", shareMethodWith = {"pos_middle_service"})
    public void noteCashReceived(Server serv, ClientWorker worker) {
        JSONObject requestData = worker.getRequestData();
        String received = requestData.optString("cash_received");
        String transId = requestData.optString("trans_id");
        String busId = requestData.optString("business_id");
        if (received.equals("Yes")) {
            Datastore.insert("POS_META_DATA",
                    new String[]{"BUSINESS_ID","META_ID","META_VALUE","CREATED"},
                    new String[]{busId,"cash_received",transId,received,timestamp()});
        } else if (received.equals("No")) {
            Filter filter1 = new FilterPredicate("BUSINESS_ID", FilterOperator.EQUAL, busId);
            Filter filter2 = new FilterPredicate("SCOPE", FilterOperator.EQUAL, "cash_received");
            Filter filter3 = new FilterPredicate("META_ID", FilterOperator.EQUAL, transId);
            Datastore.deleteMultipleEntities("POS_META_DATA",filter1,filter2,filter3);
        }
        worker.setResponseData(Message.SUCCESS);
        serv.messageToClient(worker);
    }


    
}
