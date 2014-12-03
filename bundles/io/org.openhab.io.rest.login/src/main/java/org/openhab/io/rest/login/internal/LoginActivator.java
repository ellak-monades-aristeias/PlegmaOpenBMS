package org.openhab.io.rest.login.internal;

import org.osgi.framework.BundleContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class LoginActivator implements org.osgi.framework.BundleActivator {
	
	private static final Logger logger = 
			LoggerFactory.getLogger(LoginActivator.class);

	@Override
	public void start(BundleContext context) throws Exception {
		logger.debug("LoginActivator has been started.");
		
	}

	@Override
	public void stop(BundleContext context) throws Exception {
		// TODO Auto-generated method stub
		logger.debug("LoginActivator has stopped.");
		
	}

}
