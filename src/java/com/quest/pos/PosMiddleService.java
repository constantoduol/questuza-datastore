/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.quest.pos;

import com.quest.access.control.Server;
import com.quest.access.useraccess.Serviceable;
import com.quest.access.useraccess.services.annotations.WebService;
import com.quest.servlets.ClientWorker;

/**
 *
 * @author conny
 */

@WebService(name="pos_middle_service",privileged = "yes",level = 5)
public class PosMiddleService implements Serviceable{

    @Override
    public void service() {
       
    }

    @Override
    public void onStart(Server serv) {
       
    }

    @Override
    public void onPreExecute(Server serv, ClientWorker worker) {
     
    }
    
}
