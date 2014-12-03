/**
 * openHAB, the open Home Automation Bus.
 * Copyright (C) 2010-2013, openHAB.org <admin@openhab.org>
 *
 * See the contributors.txt file in the distribution for a
 * full listing of individual contributors.
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, see <http://www.gnu.org/licenses>.
 *
 * Additional permission under GNU GPL version 3 section 7
 *
 * If you modify this Program, or any covered work, by linking or
 * combining it with Eclipse (or a modified version of that library),
 * containing parts covered by the terms of the Eclipse Public License
 * (EPL), the licensors of this Program grant you additional permission
 * to convey the resulting work.
 */
package org.openhab.persistence.psql.internal;

import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.Dictionary;
import java.util.Enumeration;
import java.util.Formatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Vector;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.lang.ArrayUtils;
import org.apache.commons.lang.StringUtils;
import org.openhab.core.items.GroupItem;
import org.openhab.core.items.Item;
import org.openhab.core.items.ItemNotFoundException;
import org.openhab.core.items.ItemRegistry;
import org.openhab.core.library.items.ColorItem;
import org.openhab.core.library.items.ContactItem;
import org.openhab.core.library.items.DateTimeItem;
import org.openhab.core.library.items.DimmerItem;
import org.openhab.core.library.items.NumberItem;
import org.openhab.core.library.items.RollershutterItem;
import org.openhab.core.library.items.SwitchItem;
import org.openhab.core.library.types.DateTimeType;
import org.openhab.core.library.types.DecimalType;
import org.openhab.core.library.types.HSBType;
import org.openhab.core.library.types.OnOffType;
import org.openhab.core.library.types.OpenClosedType;
import org.openhab.core.library.types.PercentType;
import org.openhab.core.library.types.StringType;
import org.openhab.core.persistence.FilterCriteria;
import org.openhab.core.persistence.HistoricItem;
import org.openhab.core.persistence.PersistenceService;
import org.openhab.core.persistence.QueryablePersistenceService;
import org.openhab.core.persistence.FilterCriteria.Ordering;
import org.openhab.core.types.State;
import org.openhab.core.types.UnDefType;
import org.openhab.ui.items.ItemUIRegistry;
import org.osgi.service.cm.ConfigurationException;
import org.osgi.service.cm.ManagedService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * This is the implementation of the SQL {@link PersistenceService}.
 * 
 * Data is persisted with the following conversions -:
 * 
 * Item-Type    Data-Type          MySQL-Type 
 * =========    =========          ========== 
 * ColorItem         HSBType       CHAR(25)
 * ContactItem       OnOffType     CHAR(6)
 * DateTimeItem      DateTimeType  DATETIME
 * DimmerItem        PercentType   TINYINT
 * NumberItem        DecimalType   FLOAT
 * RollershutterItem PercentType   TINYINT
 * StringItem        StringType    VARCHAR(65500)
 * SwitchItem OnOffType CHAR(3)
 * 
 * In the store method, type conversion is performed where the default type for
 * an item is not as above For example, DimmerType can return OnOffType, so to
 * keep the best resolution, we store as a number in SQL and convert to
 * DecimalType before persisting to MySQL.
 * 
 * @author Henrik Sjöstrand
 * @author Thomas.Eichstaedt-Engelen
 * @author Chris Jackson
 * @since 1.1.0
 */

public class SqlPersistenceService implements QueryablePersistenceService,
		ManagedService {

	private static final Pattern EXTRACT_CONFIG_PATTERN = Pattern
			.compile("^(.*?)\\.([0-9.a-zA-Z]+)$");

	private static final Logger logger = LoggerFactory
			.getLogger(SqlPersistenceService.class);

	private static String driverClass;
	private static String url;
	private static String user;
	private static String password;

	private static boolean initialized = false;
	protected static ItemRegistry itemRegistry;

	// Error counter - used to reconnect to database on error
	private static int errCnt;
	private static int errReconnectThreshold = 0;

	private static Connection connection = null;

	private static Map<String, String> sqlTables = new HashMap<String, String>();
	private Map<String, String> sqlTypes = new HashMap<String, String>();

	public void activate() {
		// Initialise the type array
		sqlTypes.put("COLORITEM", "CHAR(25)");
		sqlTypes.put("CONTACTITEM", "VARCHAR(6)");
		sqlTypes.put("DATETIMEITEM", "DATETIME(3)");
		sqlTypes.put("DIMMERITEM", "TINYINT");
		sqlTypes.put("GROUPITEM", "FLOAT");
		sqlTypes.put("NUMBERITEM", "FLOAT");
		sqlTypes.put("ROLERSHUTTERITEM", "TINYINT");
		sqlTypes.put("STRINGITEM", "VARCHAR(65500)");
		sqlTypes.put("SWITCHITEM", "CHAR(3)");
	}

	public void deactivate() {
		logger.debug("PSQL persistence bundle stopping. Disconnecting from database.");
		disconnectFromDatabase();
	}

	public void setItemRegistry(ItemRegistry itemRegistry) {
		this.itemRegistry = itemRegistry;
	}

	public void unsetItemRegistry(ItemRegistry itemRegistry) {
		this.itemRegistry = null;
	}

	/**
	 * @{inheritDoc
	 */
	public String getName() {
		return "psql";
	}

	private String getTable(Item item) {
		Statement statement = null;
		String sqlCmd = null;
		int rowId = 0;

		if (!isConnected())
			connectToDatabase();

		String itemName = item.getName();
		String tableName = sqlTables.get(itemName);

		// Table already exists - return the name
		if (tableName != null)
			return tableName;

		// Create a new entry in the Items table. This is the translation of
		// item name to table
		try {
			sqlCmd = new String("INSERT INTO Items (ItemName) VALUES ('"
					+ itemName + "')");

			statement = connection.createStatement();
			statement.executeUpdate(sqlCmd, Statement.RETURN_GENERATED_KEYS);

			ResultSet resultSet = statement.getGeneratedKeys();
			if (resultSet != null && resultSet.next()) {
				rowId = resultSet.getInt(1);
			}

			if (rowId == 0) {
				throw new SQLException("PSQL: Creating table for item '"
						+ itemName + "' failed.");
			}

			// Create the table name

			// help guessing table content from table name
			tableName = new String("Item" + rowId + "_" + itemName);
			logger.debug("PSQL: new item " + itemName + " is Item" + rowId);

		} catch (SQLException e) {
			logger.error("PSQL: Could not create table for item '" + itemName
					+ "': " + e.getMessage());
		} finally {
			if (statement != null) {
				try {
					statement.close();
				} catch (SQLException logOrIgnore) {
				}
			}
		}

		// An error occurred adding the item name into the index list!
		if (tableName == null) {
			logger.error("mySQL: tableName was null");
			return null;
		}

		// Default the type to FLOAT
		String mysqlType = new String("FLOAT");
		String itemType = item.getClass().toString().toUpperCase();
		itemType = itemType.substring(itemType.lastIndexOf('.') + 1);
		if (sqlTypes.get(itemType) != null) {
			mysqlType = sqlTypes.get(itemType);
		}

		// We have a rowId, create the table for the data
		sqlCmd = new String("CREATE TABLE " + tableName
				+ " (Time DATETIME, Value " + mysqlType
				+ ", PRIMARY KEY(Time));");
		logger.debug("PSQL: " + sqlCmd);

		try {
			statement = connection.createStatement();
			statement.executeUpdate(sqlCmd);

			logger.debug("PSQL: Table created for item '" + itemName
					+ "' with datatype " + mysqlType + " in SQL database.");
			sqlTables.put(itemName, tableName);
		} catch (Exception e) {
			logger.error("PSQL: Could not create table for item '" + itemName
					+ "' with statement '" + sqlCmd + "': " + e.getMessage());
		} finally {
			if (statement != null) {
				try {
					statement.close();
				} catch (Exception hidden) {
				}
			}
		}

		// Check if the new entry is in the table list
		// If it's not in the list, then there was an error and we need to do
		// some tidying up
		// The item needs to be removed from the index table to avoid duplicates
		if (sqlTables.get(itemName) == null) {
			logger.error("PSQL: Item '" + itemName
					+ "' was not added to the table - removing index");
			sqlCmd = new String("DELETE FROM Items WHERE ItemName='" + itemName
					+ "'");
			logger.debug("PSQL: " + sqlCmd);

			try {
				statement = connection.createStatement();
				statement.executeUpdate(sqlCmd);
			} catch (Exception e) {
				logger.error("PSQL: Could not remove index for item '"
						+ itemName + "' with statement '" + sqlCmd + "': "
						+ e.getMessage());
			} finally {
				if (statement != null) {
					try {
						statement.close();
					} catch (Exception hidden) {
					}
				}
			}
		}

		return tableName;
	}

	/**
	 * @{inheritDoc
	 */
	public void store(Item item, String alias) {

		// Don't log undefined/uninitialised data
		if (item.getState() instanceof UnDefType)
			return;

		if (!initialized)
			return;

		if (!isConnected())
			connectToDatabase();

		if (isConnected()) {

			String tableName = getTable(item);
			if (tableName == null) {
				logger.error("Unable to store item '{}'.", item.getName());
				return;
			}

			// Do some type conversion to ensure we know the data type.
			// This is necessary for items that have multiple types and may
			// return
			// their
			// state in a format that's not preferred or compatible with the
			// MySQL
			// type.
			// eg. DimmerItem can return OnOffType (ON, OFF), or PercentType
			// (0-100).
			// We need to make sure we cover the best type for
			// serialisation.
			String value;
			if (item instanceof DimmerItem || item instanceof RollershutterItem) {
				value = item.getStateAs(PercentType.class).toString();
			} else if (item instanceof ColorItem) {
				value = item.getStateAs(HSBType.class).toString();
			} else {
				// All other items should return the best format by default
				value = item.getState().toString();
			}

			String sqlCmd = null;
			Statement statement = null;
			try {
				statement = connection.createStatement();

				if (item.getState() != org.openhab.core.types.UnDefType.NULL) {
					sqlCmd = new String("INSERT INTO " + tableName
							+ " (TIME, VALUE) VALUES(NOW(),'"
							+ item.getState().toString() + "');");
					statement.executeUpdate(sqlCmd);

					logger.debug(
							"PSQL: Stored item '{}' as '{}'[{}] in SQL database at {}.",
							item.getName(), item.getState().toString(), item
									.getState().toString(),
							(new java.util.Date()).toString());
					logger.debug("PSQL: {}", sqlCmd);
				} else {
					logger.warn(
							"Could not store null item '{}' as '{}'[{}] in SQL database at {}.",
							item.getName(), item.getState().toString(), item
									.getState().toString(),
							(new java.util.Date()).toString());
				}

				// Success
				errCnt = 0;
			} catch (Exception e) {
				logger.error(
						"PSQL: Could not store item '{}' in database with statement '{}': {}",
						item.getName(), sqlCmd, e.getMessage());

				if (!e.getMessage().contains("Duplicate entry")) {

					disconnectFromDatabase();
					connectToDatabase();

					try {
						statement = connection.createStatement();

						if (item.getState() != org.openhab.core.types.UnDefType.NULL) {
							sqlCmd = new String("INSERT INTO " + tableName
									+ " (TIME, VALUE) VALUES(NOW(),'"
									+ item.getState().toString() + "');");
							statement.executeUpdate(sqlCmd);

							logger.debug(
									"PSQL: Stored item '{}' as '{}'[{}] in SQL database at {}.",
									item.getName(), item.getState().toString(),
									item.getState().toString(),
									(new java.util.Date()).toString());
							logger.debug("PSQL: {}", sqlCmd);
						} else {
							logger.warn(
									"Could not store null item '{}' as '{}'[{}] in SQL database at {}.",
									item.getName(), item.getState().toString(),
									item.getState().toString(),
									(new java.util.Date()).toString());
						}

						// Success
						errCnt = 0;
					} catch (Exception e2) {
						errCnt++;
						logger.error(
								"PSQL: Second attempt did not store item '{}' in database with statement '{}': {}",
								item.getName(), sqlCmd, e.getMessage());

					}
				}
			} finally {
				if (statement != null) {
					try {
						statement.close();
					} catch (Exception hidden) {
					}
				}
			}
		} else {
			logger.warn(
					"PSQL: No connection to database. Can not persist item '{}'! Will retry connecting to database next time.",
					item);
		}

	}

	/**
	 * @{inheritDoc
	 */
	public void store(Item item) {
		store(item, null);
	}

	/**
	 * Checks if we have a database connection
	 * 
	 * @return true if connection has been established, false otherwise
	 */
	private static boolean isConnected() {
		// Error check. If we have 'errReconnectThreshold' errors in a row, then
		// reconnect to the database
		if (errReconnectThreshold != 0 && errCnt > errReconnectThreshold) {
			logger.debug("PSQL: Error count exceeded " + errReconnectThreshold
					+ ". Disconnecting database.");
			disconnectFromDatabase();
		}
		return connection != null;
	}

	/**
	 * Connects to the database
	 */
	private static void connectToDatabase() {
		try {
			// Reset the error counter
			errCnt = 0;

			logger.debug("PSQL: Attempting to connect to database " + url);
			Class.forName(driverClass).newInstance();
			connection = DriverManager.getConnection(url, user, password);
			logger.debug("PSQL: Connected to database " + url);

			Statement st = connection.createStatement();
			int result = st.executeUpdate("SHOW TABLES LIKE 'Items'");
			st.close();
			if (result == 0) {
				st = connection.createStatement();
				st.executeUpdate(
						"CREATE TABLE Items (ItemId INT NOT NULL AUTO_INCREMENT,ItemName VARCHAR(200) NOT NULL,PRIMARY KEY (ItemId));",
						Statement.RETURN_GENERATED_KEYS);
				st.close();
			}

			// Retrieve the table array
			st = connection.createStatement();

			// Turn use of the cursor on.
			st.setFetchSize(50);
			ResultSet rs = st
					.executeQuery("SELECT ItemId, ItemName FROM Items");
			while (rs.next()) {

				// help guessing table content from table name
				sqlTables.put(rs.getString(2),
						"Item" + rs.getInt(1) + "_" + rs.getString(2));
			}
			rs.close();
			st.close();
		} catch (Exception e) {
			logger.error(
					"PSQL: Failed connecting to the SQL database using: driverClass="
							+ driverClass + ", url=" + url + ", user=" + user
							+ ", password=" + password, e);
		}
	}

	/**
	 * Disconnects from the database
	 */
	private static void disconnectFromDatabase() {
		if (connection != null) {
			try {
				connection.close();
				logger.debug("PSQL: Disconnected from database " + url);
			} catch (Exception e) {
				logger.warn("PSQL: Failed disconnecting from the SQL database",
						e);
			}
			connection = null;
		}
	}

	/**
	 * Formats the given <code>alias</code> by utilizing {@link Formatter}.
	 * 
	 * @param alias
	 *            the alias String which contains format strings
	 * @param values
	 *            the values which will be replaced in the alias String
	 * 
	 * @return the formatted value. All format strings are replaced by
	 *         appropriate values
	 * @see java.util.Formatter for detailed information on format Strings.
	 */
	protected String formatAlias(String alias, Object... values) {
		return String.format(alias, values);
	}

	/**
	 * @{inheritDoc
	 */
	public void updated(Dictionary<String, ?> config)
			throws ConfigurationException {
		if (config != null) {
			Enumeration<String> keys = config.keys();

			while (keys.hasMoreElements()) {
				String key = (String) keys.nextElement();

				Matcher matcher = EXTRACT_CONFIG_PATTERN.matcher(key);

				if (!matcher.matches()) {
					continue;
				}

				matcher.reset();
				matcher.find();

				if (!matcher.group(1).equals("sqltype"))
					continue;

				String itemType = matcher.group(2).toUpperCase() + "ITEM";
				String value = (String) config.get(key);

				sqlTypes.put(itemType, value);
			}

			driverClass = (String) config.get("driverClass");
			if (StringUtils.isBlank(driverClass)) {
				throw new ConfigurationException(
						"psql:driverClass",
						"The PSQL driver class is missing - please configure the sql:driverClass parameter in openhab.cfg");
			}

			url = (String) config.get("url");
			if (StringUtils.isBlank(url)) {
				throw new ConfigurationException(
						"psql:url",
						"The PSQL database URL is missing - please configure the sql:url parameter in openhab.cfg");
			}

			user = (String) config.get("user");
			if (StringUtils.isBlank(user)) {
				throw new ConfigurationException(
						"psql:user",
						"The PSQL user is missing - please configure the sql:user parameter in openhab.cfg");
			}

			password = (String) config.get("password");
			if (StringUtils.isBlank(password)) {
				throw new ConfigurationException(
						"psql:password",
						"The PSQL password is missing. Attempting to connect without password. To specify a password configure the sql:password parameter in openhab.cfg.");
			}

			String errorThresholdString = (String) config.get("reconnectCnt");
			if (StringUtils.isNotBlank(errorThresholdString)) {
				errReconnectThreshold = Integer.parseInt(errorThresholdString);
			}

			disconnectFromDatabase();
			connectToDatabase();

			// connection has been established ... initialization completed!
			initialized = true;
		}

	}

	protected static ItemUIRegistry itemUIRegistry;

	public void setItemUIRegistry(ItemUIRegistry itemUIRegistry) {
		this.itemUIRegistry = itemUIRegistry;
	}

	public void unsetItemUIRegistry(ItemUIRegistry itemUIRegistry) {
		this.itemUIRegistry = null;
	}

	
	public static  HashMap<String, List<Vector>> queryMultiple(String items,
			Date from, Date to, Boolean delta, Boolean daily, Boolean peak) {
		HashMap<String, List<Vector>> ret = new HashMap<>();
		String[] itemsArray = items.split(",");
		Vector<String> itemsFromGroup = new Vector<String>();

		for (String groupName : itemsArray) {
			try {
				Item item = itemUIRegistry.getItem(groupName);
				if (item instanceof GroupItem) {
					GroupItem groupItem = (GroupItem) item;
					for (Item member : groupItem.getMembers()) {
						itemsFromGroup.add(member.getName());
					}
					itemsArray = (String[]) ArrayUtils.removeElement(
							itemsArray, groupName);
				}
			} catch (ItemNotFoundException e) {
				// ("Group item '" + groupName + "' does not exist!");
			}
		}

		if (!itemsFromGroup.isEmpty()) {
			if (itemsArray.length > 0) {
				itemsArray = (String[]) ArrayUtils.addAll(itemsArray,
						itemsFromGroup.toArray(new String[0]));
			} else {
				itemsArray = itemsFromGroup.toArray(new String[0]);
			}
		}

		for (String item : itemsArray) {
			logger.debug("querying for {}", item);
			FilterCriteria f = new FilterCriteria();
			f.setItemName(item);
			f.setBeginDate(from);
			f.setEndDate(to);
			if (delta && !peak)
				ret.put(item, queryDelta(f,daily));
			else
				if(peak)
					ret.put(item, queryPeak(f,daily));
				else
					ret.put(item, query2(f));
		}

		return ret;
	}

	public static List<Vector> query2(FilterCriteria filter) {
		String queryString = "-";
		if (initialized) {
			if (!isConnected()) {
				connectToDatabase();
			}

			SimpleDateFormat mysqlDateFormat = new SimpleDateFormat(
					"yyyy-MM-dd HH:mm:ss");
			if (isConnected()) {
				String itemName = filter.getItemName();

				String table = sqlTables.get(itemName);
				if (table == null) {
					logger.error("PSQL: Unable to find table for query '"
							+ itemName + "'.");
					return Collections.emptyList();
				}
				
				
				Item item = null;
				try {
					if (itemRegistry != null) {
						item = itemRegistry.getItem(itemName);
						logger.debug("PSQL: item class:" + item.getClass());
					}
				} catch (ItemNotFoundException e1) {
					logger.error("Unable to get item type for {}", itemName);

					// Set type to null - data will be returned as StringType
					item = null;
				}
				
				

				String filterString = new String();

				if (filter.getBeginDate() != null) {
					if (filterString.isEmpty())
						filterString += " WHERE";
					else
						filterString += " AND";
					filterString += " TIME >='"
							+ mysqlDateFormat.format(filter.getBeginDate())
							+ "'";
				}
				if (filter.getEndDate() != null) {
					if (filterString.isEmpty())
						filterString += " WHERE";
					else
						filterString += " AND";
					filterString += " TIME <='"
							+ mysqlDateFormat.format(filter.getEndDate()
									.getTime()) + "'";
				}

				filterString += " ORDER BY 'Time' ASC"; // highcharts needed

				if (filter.getPageSize() != 0x7fffffff)
					filterString += " LIMIT " + filter.getPageNumber()
							* filter.getPageSize() + "," + filter.getPageSize();

				try {
					long timerStart = System.currentTimeMillis();

					// Retrieve the table array
					Statement st = connection.createStatement();


					queryString = "SELECT Time, Value FROM " + table;
					if (!filterString.isEmpty())
						queryString += filterString;

					logger.debug("PSQL: " + queryString);

					// Turn use of the cursor on.
					st.setFetchSize(50);

					ResultSet rs = st.executeQuery(queryString);

					long count = 0;

					List<Vector> items = new ArrayList<>();
					while (rs.next()) {
						count++;
						Double value=null;
						if (item instanceof ContactItem || itemName.toUpperCase().contains("MOTION")){
							if( rs.getString(2).equals("OPEN"))
								value = 1.0;
							else if ( rs.getString(2).equals("CLOSED"))
								value = 0.0;
						}else {
						value = roundTwoDecimals(rs.getFloat(2));
						}
						Vector kv = new Vector();
						//kv.add(rs.getTimestamp(1).toString());
						kv.add(new SimpleDateFormat("yyyy-MM-dd HH:mm").format(rs.getTimestamp(1)));
						kv.add(value);
						items.add(kv);
					}

					rs.close();
					st.close();

					long timerStop = System.currentTimeMillis();
					logger.debug("PSQL: query returned {} rows in {}ms", count,
							timerStop - timerStart);

					// Success
					errCnt = 0;

					return items;
				} catch (SQLException e) {
					errCnt++;
					logger.error("PSQL: Error running queryDelta: {} \n {}",queryString,e);
					if(e.getMessage().contains("Communications")){
						
						disconnectFromDatabase();
						connectToDatabase();
					}
				}
			}
		}
		return Collections.emptyList();
	}

	// TODO WARNING Loosing precision! should not be hardcoded in the future
	static double roundTwoDecimals(double d) {
		DecimalFormat twoDForm = new DecimalFormat("#.##");
		return Double.valueOf(twoDForm.format(d));
	}

	@Override
	public Iterable<HistoricItem> query(FilterCriteria filter) {
		String queryString ="-";
		if (initialized) {
			if (!isConnected()) {
				connectToDatabase();
			}

			SimpleDateFormat mysqlDateFormat = new SimpleDateFormat(
					"yyyy-MM-dd HH:mm:ss");
			if (isConnected()) {
				// Get the item name from the filter
				// Also get the Item object so we can determine the type
				Item item = null;
				String itemName = filter.getItemName();
				logger.debug("mySQL query: item is {}", itemName);
				try {
					if (itemRegistry != null) {
						item = itemRegistry.getItem(itemName);
					}
				} catch (ItemNotFoundException e1) {
					logger.error("Unable to get item type for {}", itemName);

					// Set type to null - data will be returned as StringType
					item = null;
				}

				String table = sqlTables.get(itemName);
				if (table == null) {
					logger.error("PSQL: Unable to find table for query '"
							+ itemName + "'.");
					return Collections.emptyList();
				}

				String filterString = new String();

				if (filter.getBeginDate() != null) {
					if (filterString.isEmpty())
						filterString += " WHERE";
					else
						filterString += " AND";
					filterString += " TIME >='"
							+ mysqlDateFormat.format(filter.getBeginDate())
							+ "'";
				}
				if (filter.getEndDate() != null) {
					if (filterString.isEmpty())
						filterString += " WHERE";
					else
						filterString += " AND";
					filterString += " TIME <='"
							+ mysqlDateFormat.format(filter.getEndDate()
									.getTime()) + "'";
				}

				if (filter.getOrdering() == Ordering.ASCENDING) {
					filterString += " ORDER BY 'Time' ASC";
				} else {
					filterString += " ORDER BY Time DESC";
				}

				if (filter.getPageSize() != 0x7fffffff)
					filterString += " LIMIT " + filter.getPageNumber()
							* filter.getPageSize() + "," + filter.getPageSize();

				try {
					long timerStart = System.currentTimeMillis();

					// Retrieve the table array
					Statement st = connection.createStatement();

					
					queryString = "SELECT Time, Value FROM " + table;
					if (!filterString.isEmpty())
						queryString += filterString;

					logger.debug("PSQL: " + queryString);

					// Turn use of the cursor on.
					st.setFetchSize(50);

					ResultSet rs = st.executeQuery(queryString);

					long count = 0;
					float value;
					State state;
					List<HistoricItem> items = new ArrayList<HistoricItem>();
					while (rs.next()) {
						count++;

						if (item instanceof NumberItem)
							state = new DecimalType(rs.getDouble(2));
						else if (item instanceof SwitchItem)
							state = OnOffType.valueOf(rs.getString(2));
						else if (item instanceof ContactItem)
							state = OpenClosedType.valueOf(rs.getString(2));
						else if (item instanceof DimmerItem)
							state = new PercentType(rs.getInt(2));
						else if (item instanceof RollershutterItem)
							state = new PercentType(rs.getInt(2));
						else if (item instanceof ColorItem)
							state = new HSBType(rs.getString(2));
						else if (item instanceof DateTimeItem) {
							Calendar calendar = Calendar.getInstance();
							calendar.setTimeInMillis(rs.getTimestamp(2)
									.getTime());
							state = new DateTimeType(calendar);
						} else {
							String tmp = rs.getString(2);
							if (org.apache.commons.lang.math.NumberUtils.isNumber(tmp)) //bug fix for janitza total on VCI was changed to string
								
								state = new DecimalType(rs.getDouble(2));
							else
								state = new StringType(tmp);
						}
							

						SqlItem mysqlItem = new SqlItem(itemName, state,
								rs.getTimestamp(1));
						items.add(mysqlItem);
					}

					rs.close();
					st.close();

					long timerStop = System.currentTimeMillis();
					logger.debug("PSQL: query returned {} rows in {}ms", count,
							timerStop - timerStart);

					// Success
					errCnt = 0;

					return items;
				} catch (SQLException e) {
					errCnt++;
					logger.error("PSQL: Error running query: {} \n {}",queryString,e);
					disconnectFromDatabase();
					connectToDatabase();
				}
			}
		}
		return Collections.emptyList();
	}

	/*
	 * //BarChart query, for daily delta (e.g. power consumption)
	 * 
	 * select sdate, delta from ( select sdate, peak - @prev AS delta, @prev :=
	 * peak from ( SELECT MAX(value) AS peak, DATE(Time) AS sdate FROM
	 * plegma.item3_ap1total GROUP BY sdate ORDER BY Time ASC ) AS T ) AS T
	 * where delta>0;
	 * 
	 * 
	 */
	public static List<Vector> queryDelta(FilterCriteria filter, Boolean daily) {
		String queryString = "-";
		if (!initialized)
			return null;

		if (!isConnected()) {
			connectToDatabase();
		}

		SimpleDateFormat mysqlDateFormat = new SimpleDateFormat(
				"yyyy-MM-dd HH:mm:ss");
		if (isConnected()) {
			String itemName = filter.getItemName();

			String table = sqlTables.get(itemName);
			if (table == null) {
				logger.error("PSQL: Unable to find table for query '"
						+ itemName + "'.");
				return Collections.emptyList();
			}

			String filterString = new String();

			if (filter.getBeginDate() != null) {
				if (filterString.isEmpty())
					filterString += " WHERE delta>=0 AND";
				else
					filterString += " AND";
				filterString += " sdate >='"
						+ mysqlDateFormat.format(filter.getBeginDate()) + "'";
			}
			if (filter.getEndDate() != null) {
				if (filterString.isEmpty())
					filterString += " WHERE delta>=0 AND";
				else
					filterString += " AND";
				filterString += " sdate <='"
						+ mysqlDateFormat.format(filter.getEndDate().getTime())
						+ "'";
			}

			if (filter.getPageSize() != 0x7fffffff)
				filterString += " LIMIT " + filter.getPageNumber()
						* filter.getPageSize() + "," + filter.getPageSize();

			try {
				long timerStart = System.currentTimeMillis();

				// Retrieve the table array
				Statement st = connection.createStatement();

				String queryDay="       GROUP BY DATE(sdate)";
				String queryHour="      GROUP BY HOUR(sdate), DATE(sdate)";
								
				queryString = " select sdate, delta"
						+ "     from ("
						+ "	      SELECT  sdate,  ROUND(peak - @prev, 2) AS delta, @prev:=peak"
						+ "	      from ("
						+ "	         	SELECT MAX(value) AS peak, Time AS sdate"
						+ "	        	FROM " + table
						//+ "             GROUP BY HOUR(sdate) , DATE(sdate)"
						+(daily?queryDay:queryHour)
						+ "             ORDER BY Time ASC" + "	) AS T1 ) AS T2"
						+ " ";
				
				if (!filterString.isEmpty())
					queryString += filterString;
				
				queryString +=" ORDER BY sdate ASC";
				logger.debug("PSQL: " + queryString);

				// Turn use of the cursor on.
				st.setFetchSize(50);

				ResultSet rs = st.executeQuery(queryString);
				List<Vector> items = new ArrayList<>();
				Date lastdate = null;
				while (rs.next()) {
					if (lastdate != null) { //skipping first record

						Vector kv = new Vector();
						if (daily) {
							if (rs.getTimestamp(1).getTime()
									- lastdate.getTime() < 2* 24 * 60 * 60 * 1000) { // time interval from bars has to be less than 2days
								kv.add(new SimpleDateFormat("yyyy-MM-dd")
										.format(rs.getTimestamp(1)));

								kv.add(rs.getFloat(2));
								items.add(kv);
							}
						} else {
							if (rs.getTimestamp(1).getTime()
									- lastdate.getTime()  < 2* 60 * 60 * 1000) { // time interval from bars has to be less than 2xhours
								kv.add(new SimpleDateFormat("yyyy-MM-dd HH") 
										.format(rs.getTimestamp(1)));

								kv.add(rs.getFloat(2));
								items.add(kv);
							}
						}
					}
					
					lastdate = rs.getTimestamp(1);
				}
				rs.close();
				st.close();

				long timerStop = System.currentTimeMillis();
				logger.debug("PSQL: query returned {} rows in {}ms", items.size(),
						timerStop - timerStart);

				// Success
				errCnt = 0;

				return items;
			} catch (SQLException e) {
				errCnt++;
				logger.error("PSQL: Error running queryDelta: {} \n {}",queryString,e);
				disconnectFromDatabase();
				connectToDatabase();
			}
		}

		return Collections.emptyList();
	
	}
	
	
	/*
	 * 
	 * 
	 * 
	 */
	public static List<Vector> queryPeak(FilterCriteria filter, Boolean daily) {
		String queryString = "-";
		if (!initialized)
			return null;

		if (!isConnected()) {
			connectToDatabase();
		}

		SimpleDateFormat mysqlDateFormat = new SimpleDateFormat(
				"yyyy-MM-dd HH:mm:ss");
		if (isConnected()) {
			String itemName = filter.getItemName();

			String table = sqlTables.get(itemName);
			if (table == null) {
				logger.error("PSQL: Unable to find table for query '"
						+ itemName + "'.");
				return Collections.emptyList();
			}

			String filterString = new String();

			if (filter.getBeginDate() != null) {
				if (filterString.isEmpty())
					filterString += " WHERE ";
				else
					filterString += " AND";
				filterString += " Time >='"
						+ mysqlDateFormat.format(filter.getBeginDate()) + "'";
			}
			if (filter.getEndDate() != null) {
				if (filterString.isEmpty())
					filterString += " WHERE ";
				else
					filterString += " AND";
				filterString += " Time <='"
						+ mysqlDateFormat.format(filter.getEndDate().getTime())
						+ "'";
			}

			if (filter.getPageSize() != 0x7fffffff)
				filterString += " LIMIT " + filter.getPageNumber()
						* filter.getPageSize() + "," + filter.getPageSize();

			try {
				long timerStart = System.currentTimeMillis();

				// Retrieve the table array
				Statement st = connection.createStatement();

				String queryDay="       GROUP BY DATE(Time)";
				String queryHour="      GROUP BY HOUR(Time), DATE(Time)";
								
				queryString = "" 
						+ "	         	SELECT MAX(value) AS peak, Time "
						+ "	        	FROM " + table
						+ " ";
				
				if (!filterString.isEmpty())
					queryString += filterString;

				queryString +=(daily?queryDay:queryHour);
				queryString +=" ORDER BY Time ASC";
				logger.debug("PSQL: " + queryString);

				// Turn use of the cursor on.
				st.setFetchSize(50);

				ResultSet rs = st.executeQuery(queryString);
				List<Vector> items = new ArrayList<>();
				long count = 0;
				while (rs.next()) {
					
						Vector kv = new Vector();
						
						if (daily)
							kv.add(new SimpleDateFormat("yyyy-MM-dd")
									.format(rs.getTimestamp(2)));
						else
							kv.add(new SimpleDateFormat("yyyy-MM-dd HH")
									.format(rs.getTimestamp(2)));
						kv.add(rs.getFloat(1));
						items.add(kv); 
						
				count++;	
				}

				rs.close();
				st.close();

				long timerStop = System.currentTimeMillis();
				logger.debug("PSQL: query returned {} rows in {}ms", count,
						timerStop - timerStart);

				// Success
				errCnt = 0;

				return items;
			} catch (SQLException e) {
				errCnt++;
				logger.error("PSQL: Error running queryPeak: {} \n {}",queryString,e);
				disconnectFromDatabase();
				connectToDatabase();
			}
		}

		return Collections.emptyList();
	}
	
	

}
