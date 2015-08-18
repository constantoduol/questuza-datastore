/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.quest.pos;

import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.datastore.Query.Filter;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.quest.access.common.UniqueRandom;
import com.quest.access.common.io;
import com.quest.access.common.datastore.Datastore;
import com.quest.access.control.Server;
import com.quest.access.useraccess.Serviceable;
import com.quest.access.useraccess.services.Message;
import com.quest.access.useraccess.services.annotations.Endpoint;
import com.quest.access.useraccess.services.annotations.WebService;
import com.quest.access.useraccess.verification.UserAction;
import com.quest.servlets.ClientWorker;
import java.util.Date;

import java.util.logging.Level;
import java.util.logging.Logger;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 *
 * @author Connie
 */

@WebService(name="pos_sale_service",privileged = "yes",level = 5)
public class PosSaleService implements Serviceable {
    

    @Override
    public void service() {
      
    }

    public void onPreExecute(Server serv, ClientWorker worker) {

    }

    @Override
    public void onStart(Server serv) {
        
    }
    
    @Endpoint(name="transact",shareMethodWith = {"pos_admin_service"})
    public void transact(Server serv,ClientWorker worker) throws JSONException{
        JSONObject requestData = worker.getRequestData();
        JSONArray ids = requestData.optJSONArray("product_ids");
        JSONArray qtys = requestData.optJSONArray("product_qtys");
        String narration = requestData.optString("narration");
        String busId = requestData.optString("business_id");
        String bType = requestData.optString("business_type");
        String type = requestData.optString("tran_type");
        String tranFlag = requestData.optString("tran_flag");
        String userName = worker.getSession().getAttribute("username").toString();
        for (int x = 0; x < ids.length(); x++) {
            try {
                String prodId = ids.optString(x);
                String transId = new UniqueRandom(50).nextMixedRandom();
                Filter filter = new FilterPredicate("ID",FilterOperator.EQUAL,prodId);
                Filter filter1 = new FilterPredicate("BUSINESS_ID",FilterOperator.EQUAL,busId);
                JSONObject prodData = Datastore.entityToJSONArray(Datastore.getSingleEntity("PRODUCT_DATA", filter,filter1));
                double bp = prodData.optJSONArray("BP_UNIT_COST").optDouble(0);
                double sp = prodData.optJSONArray("SP_UNIT_COST").optDouble(0);
                double tax = prodData.optJSONArray("TAX").optDouble(0);
                double comm = prodData.optJSONArray("COMMISSION").optDouble(0);
                //take care of shared products, deduct from the correct stock
                String parentProduct = prodData.optJSONArray("PRODUCT_PARENT").optString(0);
                Filter filter2 = new FilterPredicate("ID",FilterOperator.EQUAL,parentProduct);
                double uSize = prodData.optJSONArray("PRODUCT_UNIT_SIZE").optDouble(0, 1);
                Double unitSize = prodData.optJSONArray("PRODUCT_UNIT_SIZE").optDouble(0, 1) == 0 ? 1 : uSize;
                //get the parent product available qty
                double productTotalqty;
                Double noOfUnits = qtys.optDouble(x);
                if (parentProduct.isEmpty()) {
                    productTotalqty = prodData.optJSONArray("PRODUCT_QTY").optDouble(0);
                    //no parent product
                } else {
                    JSONObject parentProdData = Datastore.entityToJSONArray(Datastore.getSingleEntity("PRODUCT_DATA", filter1,filter2));
                    productTotalqty = parentProdData.optJSONArray("PRODUCT_QTY").optDouble(0);
                }

                Double unitsSold = noOfUnits * unitSize;
                Double newQty = productTotalqty - unitsSold; //reduce the quantity, customer is buying stock
                Double cost = sp * noOfUnits;
                Double bPrice = bp * noOfUnits;
                Double profit = cost - bPrice;
                if (unitsSold > productTotalqty && type.equals("0") && bType.equals("goods")) {
                    continue; //consider this for services where stock is tracked
                    //not enough stock to process the sale
                }
                else if (type.equals("0")) {
                    narration = narration.equals("") ? "Sale to Customer" : narration;
                    if (tax > 0) {
                        Double taxValue = (tax / 100) * cost;
                        String [] props1 = new String[]{"USER_NAME","BUSINESS_ID","PRODUCT_ID","TAX_VALUE","UNITS_SOLD","CREATED"};
                        String [] values1 =  new String[]{userName, busId, prodId, taxValue.toString(), unitsSold.toString(),((Long)System.currentTimeMillis()).toString()};
                        Datastore.insert("TAX_DATA",props1,values1);
                    }

                    if (comm > 0) { //track only if we have a value
                        Double commValue = comm * noOfUnits;
                        String[] props2 = new String[]{"USER_NAME", "BUSINESS_ID", "PRODUCT_ID", "TAX_VALUE", "UNITS_SOLD", "CREATED"};
                        String[] values2 = new String[]{userName, busId, prodId, commValue.toString(), unitsSold.toString(),((Long)System.currentTimeMillis()).toString()};
                        Datastore.insert("COMMISSION_DATA", props2, values2);
                    }
                } 
                else if (type.equals("1")) {
                    newQty = productTotalqty + noOfUnits; //increase the quantity if customer is returning stock
                    narration = narration.equals("") ? "Reversal of sale" : narration;
                    profit = -profit;
                  
                }
                
                String [] props = new String[]{"BUSINESS_ID","PRODUCT_ID","TRAN_TYPE","STOCK_COST_BP","STOCK_COST_SP","STOCK_QTY","PROFIT","TRAN_FLAG","NARRATION","CREATED","USER_NAME"};
                String [] values = new String[]{transId,busId, prodId, type, bPrice.toString(), cost.toString(), unitsSold.toString(),
                    profit.toString(),tranFlag, narration, ((Long)System.currentTimeMillis()).toString(),userName};
                
                Datastore.insert("STOCK_DATA", props, values);
                if (parentProduct.isEmpty()) {
                    //no parent product 
                    Datastore.updateSingleEntity("PRODUCT_DATA",new String[]{"PRODUCT_QTY"},new String[]{newQty.toString()}, filter,filter1);
                } else {
                    Datastore.updateSingleEntity("PRODUCT_DATA",new String[]{"PRODUCT_QTY"},new String[]{newQty.toString()}, filter1,filter2);
                }
               
            } catch (Exception ex) {
                Logger.getLogger(PosSaleService.class.getName()).log(Level.SEVERE, null, ex);
                ex.printStackTrace();
            }
        }
       
        JSONObject response = new JSONObject();
        response.put("status",Message.SUCCESS);
        response.put("server_time",new Date());
        worker.setResponseData(response);
        serv.messageToClient(worker);
    }
    
}
