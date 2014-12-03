package org.openhab.persistence.psql.internal;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;
import java.util.Vector;

import javax.servlet.Servlet;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;

import org.joda.time.DateTime;
import org.openhab.core.persistence.HistoricItem;
import org.openhab.core.persistence.PersistenceService;
import org.openhab.io.net.http.SecureHttpContext;
import org.openhab.ui.items.ItemUIRegistry;
import org.osgi.service.http.HttpContext;
import org.osgi.service.http.HttpService;
import org.osgi.service.http.NamespaceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.google.gson.Gson;

public class PsqlServlet implements Servlet {

	private static final Logger logger = LoggerFactory
			.getLogger(PsqlServlet.class);

	public static final String SERVLET_NAME = "/psqlservlet";

	protected HttpService httpService;
	protected SqlPersistenceService sqlPersistenceService;
	protected ItemUIRegistry itemUIRegistry;

	public void setItemUIRegistry(ItemUIRegistry itemUIRegistry) {
		this.itemUIRegistry = itemUIRegistry;
	}

	public void unsetItemUIRegistry(ItemUIRegistry itemUIRegistry) {
		this.itemUIRegistry = null;
	}

	@Override
	public void init(ServletConfig config) throws ServletException {
		// TODO Auto-generated method stub

	}

	@Override
	public ServletConfig getServletConfig() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public void service(ServletRequest req, ServletResponse res)
			throws ServletException, IOException {
		// TODO Auto-generated method stub
		List<String> errors = new ArrayList<String>();
		DateTime fromDate = null;
		DateTime toDate = null;
		String[] items = null;

		Map<String, String[]> params = req.getParameterMap();
		if (params.get("fromDate") == null) {
			// errors.add("cant find parameter \"fromDate\"");
			fromDate = new DateTime(0);
			logger.debug("fromDate is {}", fromDate);
		} else {
			try {
				String fromDateS = params.get("fromDate")[0];
				fromDate = new DateTime(Long.parseLong(fromDateS) * 1000);
				logger.debug("fromDate is {}", fromDate);
			} catch (NumberFormatException e) {
				// TODO Auto-generated catch block
				errors.add("parameter 'fromDate' must be a long number (epoch time format)");
			}
		}

		if (params.get("toDate") == null) {
			// errors.add("cant find parameter \"toDate\"");
			toDate = new DateTime(); // now
			logger.debug("toDate is {}", toDate);
		} else {
			try {
				String toDateS = params.get("toDate")[0];
				toDate = new DateTime(Long.parseLong(toDateS) * 1000);
				logger.debug("toDate is {}", toDate);
			} catch (NumberFormatException e) {
				// TODO Auto-generated catch block
				errors.add("parameter 'toDate' must be a long number (epoch time format)");
			}
		}

		if (params.get("items") == null) {
			errors.add("cant find parameter 'items'");
		} else {
			items = params.get("items");
		}

		if (!errors.isEmpty()) {
			respondWithErrors(res, errors);
			return;
		}
		HashMap<String, List<Vector>> results = null;
		
		if (params.get("delta")!=null || params.get("deltaday")!=null){ // Barchart //&& "true".equals(params.get("delta")[0])
			logger.debug("Delta day for Bargraph");
			results = SqlPersistenceService.queryMultiple(items[0],
					fromDate.toDate(), toDate.toDate(), true, true, false);//delta and daily
		}
		else if (params.get("deltahour")!=null){ // Barchart hourly
				logger.debug("Delta hour for Bargraph");
				results = SqlPersistenceService.queryMultiple(items[0],
						fromDate.toDate(), toDate.toDate(), true, false, false);//delta and daily

		}
		else if (params.get("peakday")!=null){ // Barchart of peaks grouped per day
					logger.debug("Peak day for Bargraph");
					results = SqlPersistenceService.queryMultiple(items[0],
							fromDate.toDate(), toDate.toDate(), false, true, true );//peak daily (useful for daily items)

		} else { // typical chart
			logger.debug("Typical line chart");
			results = SqlPersistenceService.queryMultiple(items[0],
					fromDate.toDate(), toDate.toDate(), false,false,false);
		}

		Gson gson = new Gson();
		logger.debug("request params {}", params);
		res.setContentType("application/json");
		PrintWriter out = res.getWriter();
		out.println(gson.toJson(results));
		out.close();

	}

	@Override
	public String getServletInfo() {
		// TODO Auto-generated method stub
		return null;
	}

	@Override
	public void destroy() {
		// TODO Auto-generated method stub

	}

	public void setHttpService(HttpService httpService) {
		this.httpService = httpService;
	}

	public void unsetSqlPersistenceService(
			PersistenceService sqlPersistenceService) {
		this.sqlPersistenceService = null;
	}

	public void setSqlPersistenceService(
			PersistenceService sqlPersistenceService) {
		logger.debug("setSqlPersistenceService");
		this.sqlPersistenceService = (org.openhab.persistence.psql.internal.SqlPersistenceService) sqlPersistenceService;
	}

	public void unsetHttpService(HttpService httpService) {
		this.httpService = null;
	}

	public void respondWithErrors(ServletResponse res, List<String> errors) {
		HashMap<String, List<String>> responseMap = new HashMap<String, List<String>>();
		responseMap.put("errors", errors);
		Gson gson = new Gson();
		String json = gson.toJson(responseMap);

		res.setContentType("application/json");
		PrintWriter out;
		try {
			out = res.getWriter();
			out.println(json);
			out.close();
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	protected void activate() {
		try {
			logger.debug("Starting up psql servlet at " + SERVLET_NAME);

			Hashtable<String, String> props = new Hashtable<String, String>();
			httpService.registerServlet(SERVLET_NAME, this, props,
					createHttpContext());

		} catch (NamespaceException e) {
			logger.error("Error during servlet startup", e);
		} catch (ServletException e) {
			logger.error("Error during servlet startup", e);
		} catch (Exception e) {
			logger.error("Error during servlet startup", e);
		}
	}

	protected HttpContext createHttpContext() {
		HttpContext defaultHttpContext = httpService.createDefaultHttpContext();
		return new SecureHttpContext(defaultHttpContext, "plegma");
	}

}
