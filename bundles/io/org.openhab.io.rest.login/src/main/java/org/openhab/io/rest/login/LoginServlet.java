package org.openhab.io.rest.login;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Hashtable;

import javax.security.auth.Subject;
import javax.security.auth.callback.Callback;
import javax.security.auth.callback.CallbackHandler;
import javax.security.auth.callback.NameCallback;
import javax.security.auth.callback.UnsupportedCallbackException;
import javax.security.auth.login.LoginContext;
import javax.security.auth.login.LoginException;
import javax.servlet.Servlet;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang.StringUtils;
import org.apache.commons.net.util.Base64;
import org.eclipse.jetty.plus.jaas.callback.ObjectCallback;
import org.openhab.io.net.http.SecureHttpContext;
import org.openhab.ui.items.ItemUIRegistry;
import org.osgi.service.http.HttpContext;
import org.osgi.service.http.HttpService;
import org.osgi.service.http.NamespaceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class LoginServlet implements Servlet {

	private static final Logger logger = LoggerFactory
			.getLogger(LoginServlet.class);

	public static final String SERVLET_NAME = "/loginservlet";

//	private static final String HTTP_HEADER__AUTHENTICATE = "WWW-Authenticate";

	private static final String HTTP_HEADER__AUTHORIZATION = "Authorization";

	private String realm = "plegma";

	protected HttpService httpService;
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
	public void service(ServletRequest req, ServletResponse response)
			throws ServletException, IOException {
		// TODO Auto-generated method stub

		HttpServletRequest request = (HttpServletRequest) req;
		HttpServletResponse httpResponse = (HttpServletResponse) response;
		String methodType = request.getMethod();
		if (methodType.equalsIgnoreCase("POST")) {

			logger.debug("we want to authenticate!");
			logger.debug("we make a request: {}", request.getRequestURI());

			String authHeader = request.getHeader(HTTP_HEADER__AUTHORIZATION);
			logger.debug("the auth header is {}", authHeader);

			boolean authenticationResult = false;

			logger.debug("the auth header is {}", authHeader);
			try {
				authenticationResult = computeAuthHeader(request, authHeader,
						realm);
				if (!authenticationResult) {
					sendAuthenticationHeader(httpResponse, realm);
				} else {
					httpResponse.setStatus(200);
					httpResponse.setContentType("text/html");
					PrintWriter pw = httpResponse.getWriter();
					pw.println("OK");

					logger.debug("i had a successful login!");
				}
			} catch (IOException ioe) {
				logger.warn("sending response failed",
						ioe.getLocalizedMessage());
			}
		}
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

	public void unsetHttpService(HttpService httpService) {
		this.httpService = null;
	}

	protected void activate() {
		try {
			logger.debug("Starting up login servlet at " + SERVLET_NAME);

			Hashtable<String, String> props = new Hashtable<String, String>();
			httpService.registerServlet(SERVLET_NAME, this, props,
					createHttpContext());

		} catch (NamespaceException e) {
			logger.error("Error during servlet startup", e);
		} catch (ServletException e) {
			logger.error("Error during servlet startup", e);
		}
	}

	protected HttpContext createHttpContext() {
		HttpContext defaultHttpContext = httpService.createDefaultHttpContext();
		return defaultHttpContext;
	}

	private boolean computeAuthHeader(HttpServletRequest request,
			final String authHeader, final String realm) {
		logger.trace("received authentication request '{}'", authHeader);

		String[] authHeaders = authHeader.trim().split(" ");
		if (authHeaders.length == 2) {
			String authType = StringUtils.trim(authHeaders[0]);
			String authInfo = StringUtils.trim(authHeaders[1]);

			if (HttpServletRequest.BASIC_AUTH.equalsIgnoreCase(authType)) {
				String authInfoString = new String(
						Base64.decodeBase64(authInfo));
				String[] authInfos = authInfoString.split(":");
				if (authInfos.length < 2) {
					logger.warn(
							"authInfos '{}' must contain two elements separated by a colon",
							authInfoString);
					return false;
				}

				String username = authInfos[0];
				String password = authInfos[1];

				Subject subject = authenticate(realm, username, password);
				if (subject != null) {
					request.setAttribute(HttpContext.AUTHENTICATION_TYPE,
							HttpServletRequest.BASIC_AUTH);
					request.setAttribute(HttpContext.REMOTE_USER, username);
					logger.trace("authentication of user '{}' succeeded!",
							username);
					return true;
				}
			} else {
				logger.warn(
						"we don't support '{}' authentication -> processing aborted",
						authType);
			}
		} else {
			logger.warn(
					"authentication header '{}' must contain of two parts separated by a blank",
					authHeader);
		}

		return false;
	}

	private void sendAuthenticationHeader(HttpServletResponse response,
			final String realm) throws IOException {
//		response.setHeader(HTTP_HEADER__AUTHENTICATE,
//				HttpServletRequest.BASIC_AUTH + " realm=\"" + realm + "\"");
		response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
	}

	private Subject authenticate(final String realm, final String username,
			final String password) {
		try {
			logger.trace("going to authenticate user '{}', realm '{}'",
					username, realm);

			Subject subject = new Subject();

			LoginContext lContext = new LoginContext(realm, subject,
					new CallbackHandler() {
						public void handle(Callback[] callbacks)
								throws IOException,
								UnsupportedCallbackException {
							for (int i = 0; i < callbacks.length; i++) {
								if (callbacks[i] instanceof NameCallback) {
									((NameCallback) callbacks[i])
											.setName(username);
								} else if (callbacks[i] instanceof ObjectCallback) {
									((ObjectCallback) callbacks[i])
											.setObject(password);
								} else {
									throw new UnsupportedCallbackException(
											callbacks[i]);
								}
							}
						}
					});
			lContext.login();

			// TODO: TEE: implement role handling here!

			return subject;
		} catch (LoginException le) {
			logger.warn("authentication of user '" + username + "' failed", le);
			return null;
		}
	}

}
