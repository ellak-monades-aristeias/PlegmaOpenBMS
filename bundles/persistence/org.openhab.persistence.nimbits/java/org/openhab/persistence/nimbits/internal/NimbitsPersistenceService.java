/**
 * Copyright (c) 2010-2014, openHAB.org and others.
 * 
 * All rights reserved. This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v1.0 which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 */
package org.openhab.persistence.nimbits.internal;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Dictionary;
import java.util.List;

import org.apache.commons.lang.StringUtils;
import org.openhab.core.items.Item;
import org.openhab.core.items.ItemNotFoundException;
import org.openhab.core.items.ItemRegistry;
import org.openhab.core.library.items.ContactItem;
import org.openhab.core.library.items.DimmerItem;
import org.openhab.core.library.items.SwitchItem;
import org.openhab.core.library.types.DateTimeType;
import org.openhab.core.library.types.DecimalType;
import org.openhab.core.library.types.OnOffType;
import org.openhab.core.library.types.OpenClosedType;
import org.openhab.core.library.types.PercentType;
import org.openhab.core.persistence.FilterCriteria;
import org.openhab.core.persistence.HistoricItem;
import org.openhab.core.persistence.PersistenceService;
import org.openhab.core.persistence.QueryablePersistenceService;
import org.openhab.core.types.State;
import org.openhab.core.types.UnDefType;
import org.osgi.service.cm.ConfigurationException;
import org.osgi.service.cm.ManagedService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.nimbits.client.model.UrlContainer;
import com.nimbits.client.model.common.impl.CommonFactory;
import com.nimbits.client.model.email.EmailAddress;
import com.nimbits.client.model.server.Server;
import com.nimbits.client.model.server.ServerFactory;
import com.nimbits.client.model.user.User;
import com.nimbits.client.model.value.Value;
import com.nimbits.io.helper.HelperFactory;
import com.nimbits.io.helper.PointHelper;
import com.nimbits.io.helper.UserHelper;
import com.nimbits.io.helper.ValueHelper;

/**
 * This is the implementation of the Nimbits {@link PersistenceService}. It
 * persists item values using the Nimbits v2 service.
 * 
 * @author Manolis Nikiforakis - Initial Contribution
 * @since 1.5.1
 */
public class NimbitsPersistenceService implements QueryablePersistenceService,
		ManagedService {

	private static final String DEFAULT_URL = "http://localhost:8081";

	private UserHelper sessionHelper = null;
	private PointHelper pointHelper;
	private ValueHelper valueHelper;
	private Server SERVER;
	private EmailAddress EMAIL_ADDRESS;
	private String url;
	private String email;
	private String ACCESS_KEY;

	private static final String DIGITAL_VALUE_OFF = "0";
	private static final String DIGITAL_VALUE_ON = "1";
	private ItemRegistry itemRegistry;
	private static final Logger logger = LoggerFactory
			.getLogger(NimbitsPersistenceService.class);

	private boolean isProperlyConfigured;
	private boolean connected;

	public void setItemRegistry(ItemRegistry itemRegistry) {
		this.itemRegistry = itemRegistry;
	}

	public void unsetItemRegistry(ItemRegistry itemRegistry) {
		this.itemRegistry = null;
	}

	public void activate() {
		logger.debug("Nimbits persistence service activated");
	}

	public void deactivate() {
		logger.debug("Nimbits persistence service deactivated");
		disconnect();
	}

	private void connect() {
		logger.debug("trying to connect nimbits");
		if (sessionHelper == null) {
			try {
				logger.debug("connecting nimbits...");
				UrlContainer INSTANCE_URL = UrlContainer.getInstance(url);
				SERVER = ServerFactory.getInstance(INSTANCE_URL);
				EMAIL_ADDRESS = CommonFactory.createEmailAddress(email);

				sessionHelper = HelperFactory.getUserHelper(SERVER,
						EMAIL_ADDRESS, ACCESS_KEY);
				User user = sessionHelper.getSession();
				logger.info("Nimbits server connected, session user:{}",
						user.getEmail());

				pointHelper = HelperFactory.getPointHelper(SERVER,
						EMAIL_ADDRESS, ACCESS_KEY);
				valueHelper = HelperFactory.getValueHelper(SERVER,
						EMAIL_ADDRESS, ACCESS_KEY);
			} catch (Exception e) {
				logger.error("Nimbits server connection failed!\nerror:{}", e);
			}

		}
		connected = true;
	}

	private boolean checkConnection() {
		boolean dbStatus = true;
		return dbStatus;
	}

	private void disconnect() {
		connected = false;
		valueHelper = null;
		sessionHelper = null;
	}

	private boolean isConnected() {
		return connected;
	}

	@Override
	public String getName() {
		return "nimbits";
	}

	@Override
	public void store(Item item) {
		store(item, null);
	}

	/**
	 * {@inheritDoc}
	 */
	@Override
	public void store(Item item, String alias) {

		if (item.getState() instanceof UnDefType) {
			logger.error("UnDefType item in nimbits store");
			return;
		}

		if (!isProperlyConfigured) {
			logger.error("Configuration for nimbits not yet loaded or broken. (store)");
			return;
		}

		if (!isConnected()) {
			logger.error("nimbbits is not yet connected!");
			return;
		}

		String realName = item.getName();
		String name = (alias != null) ? alias : realName;

		// if(!pointHelper.pointExists(name)){
		// pointHelper.createPoint(name, "to add metadata");
		// logger.trace("Creating point {} in nimbtis {}", name);
		// }

		Double doublevalue = stateToObject(item.getState());
		try {
			Value nimbitsvalue = valueHelper.recordValue(name, doublevalue);
			logger.debug("Nimbits Recorded Value:{} for Point:{}",
					nimbitsvalue.getValueWithData(), name);
		} catch (Exception e) {
			if (e.getMessage().contains("Point Not Found")) {
				try {
					pointHelper.createPoint(name, "todo: add metadata");
					logger.trace("Creating point {} in nimbtis {}", name);
					Value nimbitsvalue = valueHelper.recordValue(name,
							doublevalue);
					logger.debug("Nimbits Recorded Value:{}",
							nimbitsvalue.getValueWithData());
				} catch (Exception e2) {
					logger.error(
							"Nimbits did not manage to create new point for record value:{} for item {} \nError:",
							doublevalue, name, e);
				}
			} else
				logger.error(
						"Nimbits did not record value:{} for item {} \nError:",
						doublevalue, name, e);
		}
	}

	@Override
	public void updated(Dictionary<String, ?> config)
			throws ConfigurationException {
		disconnect();

		if (config == null) {
			throw new ConfigurationException("nimbits",
					"The configuration for nimbits is missing fix openhab.cfg");
		} else {
			logger.debug("Configuring nimbits persistance");
		}

		url = (String) config.get("url");
		if (StringUtils.isBlank(url)) {
			url = DEFAULT_URL;
			logger.debug("using default url {}", DEFAULT_URL);
		} else
			logger.debug("using nimbits server: {}", url);

		email = (String) config.get("email");
		if (StringUtils.isBlank(email)) {
			email = "local@localhost.com";
			logger.debug("using default email {}", email);
		} else
			logger.debug("using nimbits email: {}", email);

		ACCESS_KEY = (String) config.get("ACCESS_KEY");
		if (StringUtils.isBlank(ACCESS_KEY)) {
			throw new ConfigurationException(
					"nimbits:ACCESS_KEY",
					"The ACCESS_KEY is missing. To specify a ACCESS_KEY configure the ACCESS_KEY parameter in openhab.cfg.");
		} else
			logger.debug("using nimbits key: {}", ACCESS_KEY);

		isProperlyConfigured = true;
		connect();

		// check connection; errors will only be logged, hoping the connection
		// will work at a later time.
		if (!checkConnection()) {
			logger.error("nimbits connection does not work for now!");
		}
	}

	@Override
	public Iterable<HistoricItem> query(FilterCriteria filter) {
		Integer pageSize = null;
		Integer pageNumber = null;
		logger.debug("got a query");

		if (!isProperlyConfigured) {
			logger.error("Configuration for nimbits not yet loaded or broken. (query)");
			return Collections.emptyList();
		}

		if (!isConnected()) {
			logger.error("Nimbits is not yet? connected");
			return Collections.emptyList();
		}

		List<HistoricItem> historicItems = new ArrayList<HistoricItem>();
		//
		// StringBuffer query = new StringBuffer();
		// query.append("select ");
		// query.append(VALUE_COLUMN_NAME);
		// query.append(", ");
		// query.append(TIME_COLUMN_NAME);
		// query.append(" ");
		// query.append("from ");
		//
		// if (filter.getItemName() != null) {
		// query.append(filter.getItemName());
		// } else {
		// query.append("/.*/");
		// }
		//
		// if (filter.getState() != null || filter.getOperator() != null ||
		// filter.getBeginDate() != null
		// || filter.getEndDate() != null) {
		// query.append(" where ");
		// boolean foundState = false;
		// boolean foundBeginDate = false;
		// if (filter.getState() != null && filter.getOperator() != null) {
		// String value = stateToString(filter.getState());
		// if (value != null) {
		// foundState = true;
		// query.append(VALUE_COLUMN_NAME);
		// query.append(" ");
		// query.append(filter.getOperator().toString());
		// query.append(" ");
		// query.append(value);
		// }
		// }
		//
		// if (filter.getBeginDate() != null) {
		// foundBeginDate = true;
		// if (foundState) {
		// query.append(" and");
		// }
		// query.append(" ");
		// query.append(TIME_COLUMN_NAME);
		// query.append(" > '");
		// query.append(dateFormat.format(filter.getBeginDate()));
		// query.append("'");
		// }
		//
		// if (filter.getEndDate() != null) {
		// if (foundState || foundBeginDate) {
		// query.append(" and");
		// }
		// query.append(" ");
		// query.append(TIME_COLUMN_NAME);
		// query.append(" < '");
		// query.append(dateFormat.format(filter.getEndDate().getTime()));
		// query.append("'");
		// }
		//
		// if (filter.getOrdering() == Ordering.ASCENDING) {
		// query.append(" order asc");
		// }
		//
		// if (filter.getPageSize() != 0) {
		// logger.debug("got page size {}", filter.getPageSize());
		// pageSize = filter.getPageSize();
		// }
		//
		// if (filter.getPageNumber() != 0) {
		// logger.debug("got page number {}", filter.getPageNumber());
		// pageNumber = filter.getPageNumber();
		// }
		// }
		// logger.debug("query string: {}", query.toString());
		// List<Serie> results = Collections.emptyList();
		// try {
		// results = influxDB.Query(dbName, query.toString(),
		// TimeUnit.MILLISECONDS);
		// } catch (RuntimeException e) {
		// logger.error("query failed with database error");
		// handleDatabaseException(e);
		// }
		// for (Serie result : results) {
		// String historicItemName = result.getName();
		// logger.trace("item name ", historicItemName);
		// String[] columns = result.getColumns();
		// int timeColumnNum = 0;
		// int valueColumnNum = 0;
		// for (int i = 0; i < columns.length; i++) {
		// String column = columns[i];
		// logger.trace("column name: ", column);
		// if (column.equals(TIME_COLUMN_NAME)) {
		// timeColumnNum = i;
		// } else if (column.equals(VALUE_COLUMN_NAME)) {
		// valueColumnNum = i;
		// }
		// }
		// Object[][] points = result.getPoints();
		// for (int i = 0; i < points.length; i++) {
		// if (pageSize != null && pageNumber == null && pageSize < i) {
		// logger.debug("returning no more points pageSize {} pageNumber {} i {}",
		// pageSize,
		// pageNumber, i);
		// break;
		// }
		// Object[] objects = points[i];
		// logger.trace("adding historic item {}: time {} value {}",
		// historicItemName,
		// (Double) objects[timeColumnNum],
		// String.valueOf(objects[valueColumnNum]));
		// historicItems.add(new NimbitsItem(historicItemName, stringToState(
		// String.valueOf(objects[valueColumnNum]), historicItemName), new Date(
		// ((Double) objects[timeColumnNum]).longValue())));;
		// }
		// }

		return historicItems;
	}

	/**
	 * Converts {@link State} to objects fitting into nimbits values.
	 * 
	 * @param state
	 *            to be converted
	 * @return integer or double value for DecimalType and PercentType, an
	 *         integer for DateTimeType and 0 or 1 for OnOffType and
	 *         OpenClosedType.
	 */
	private Double stateToObject(State state) {
		Double value = -1.0; // TODO
		if (state instanceof PercentType) {
			value = ((PercentType) state).toBigDecimal().doubleValue();
		} else if (state instanceof DecimalType) {
			value = ((DecimalType) state).toBigDecimal().doubleValue();
		} else if (state instanceof DateTimeType) {
			// value = ((DateTimeType)
			// state).getCalendar().getTime().getTime().doubleValue();
		} else if (state instanceof OnOffType) {
			value = (OnOffType) state == OnOffType.ON ? 1.0 : 0.0;
		} else if (state instanceof OpenClosedType) {
			value = (OpenClosedType) state == OpenClosedType.OPEN ? 1.0 : 0.0;
		} else {
			// value = state.toString();
		}
		return value;
	}

	/**
	 * Converts {@link State} to a String suitable for influxdb queries.
	 * 
	 * @param state
	 *            to be converted
	 * @return {@link String} equivalent of the {@link State}
	 */
	private String stateToString(State state) {
		String value;
		if (state instanceof PercentType) {
			value = ((PercentType) state).toBigDecimal().toString();
		} else if (state instanceof DateTimeType) {
			value = String.valueOf(((DateTimeType) state).getCalendar()
					.getTime().getTime());
		} else if (state instanceof DecimalType) {
			value = ((DecimalType) state).toBigDecimal().toString();
		} else if (state instanceof OnOffType) {
			value = ((OnOffType) state) == OnOffType.ON ? DIGITAL_VALUE_ON
					: DIGITAL_VALUE_OFF;
		} else {
			value = state.toString();
		}
		return value;
	}

	/**
	 * Converts a value to a {@link State} which is suitable for the given
	 * {@link Item}. This is needed for querying a {@link HistoricState}.
	 * 
	 * @param value
	 *            to be converted to a {@link State}
	 * @param itemName
	 *            name of the {@link Item} to get the {@link State} for
	 * @return
	 */
	private State stringToState(String value, String itemName) {
		if (itemRegistry != null) {
			try {
				Item item = itemRegistry.getItem(itemName);
				if (item instanceof SwitchItem && !(item instanceof DimmerItem)) {
					return value.equals(DIGITAL_VALUE_OFF) ? OnOffType.OFF
							: OnOffType.ON;
				} else if (item instanceof ContactItem) {
					return value.equals(DIGITAL_VALUE_OFF) ? OpenClosedType.CLOSED
							: OpenClosedType.OPEN;
				}
			} catch (ItemNotFoundException e) {
				logger.warn("Could not find item '{}' in registry", itemName);
			}
		}
		// just return a DecimalType as a fallback
		return new DecimalType(value);
	}

}
