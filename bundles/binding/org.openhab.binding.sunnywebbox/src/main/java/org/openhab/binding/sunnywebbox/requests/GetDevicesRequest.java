package org.openhab.binding.sunnywebbox.requests;

import static com.jayway.jsonpath.Criteria.where;
import static com.jayway.jsonpath.Filter.filter;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import us.monoid.web.Content;
import us.monoid.web.Resty;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.jayway.jsonpath.JsonPath;

public class GetDevicesRequest {
	String version;
	String proc;
	String id;
	String format;
	
	private static final Logger logger = LoggerFactory
			.getLogger(GetPlantOverviewRequest.class);
	
	public GetDevicesRequest() {
		this.version="1.0";
		this.id="1";
		this.format="JSON";
		this.proc="GetDevices";
	}
	
	public String getVersion() {
		return version;
	}
	public void setVersion(String version) {
		this.version = version;
	}
	public String getProc() {
		return proc;
	}
	public void setProc(String proc) {
		this.proc = proc;
	}
	public String getId() {
		return id;
	}
	public void setId(String id) {
		this.id = id;
	}
	public String getFormat() {
		return format;
	}
	public void setFormat(String format) {
		this.format = format;
	}
	public List<Object> getDevices(String URL){
		
		Resty r = new Resty();
		Gson gson = new GsonBuilder().setPrettyPrinting().create();		
    	String json = gson.toJson(this);
    	String req = "RPC="+json;
		try {
			String response = r.json("http://"+URL+"/rpc",
					new Content("application/json",req.getBytes())).toObject().toString();
			
			logger.debug("JSON received:{}", response);
			
			List<Object> values = JsonPath.read(response, "$.result.devices[*].key");
			return values;
		} catch (Exception e) {
			// TODO Auto-generated catch block
			logger.error("error in URL?",e);
			//e.printStackTrace();
			return null;
		}
	}

}
