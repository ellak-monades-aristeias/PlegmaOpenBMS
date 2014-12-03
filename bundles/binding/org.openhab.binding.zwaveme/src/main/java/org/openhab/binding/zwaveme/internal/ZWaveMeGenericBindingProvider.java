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
package org.openhab.binding.zwaveme.internal;

import java.util.List;

import org.openhab.binding.zwaveme.ZwaveMeBindingProvider;
import org.openhab.core.binding.BindingConfig;
import org.openhab.core.items.Item;
import org.openhab.core.library.items.DimmerItem;
import org.openhab.core.library.items.SwitchItem;
import org.openhab.model.item.binding.AbstractGenericBindingProvider;
import org.openhab.model.item.binding.BindingConfigParseException;


/**
 * This class is responsible for parsing the binding configuration.
 * 
 * @author johngouf
 * @since 1.3.1
 */
public class ZWaveMeGenericBindingProvider extends AbstractGenericBindingProvider implements ZwaveMeBindingProvider {

	/**
	 * {@inheritDoc}
	 */
	public String getBindingType() {
		return "sunnywebbox";
	}

	/**
	 * @{inheritDoc}
	 */
	@Override
	public void validateItemType(Item item, String bindingConfig) throws BindingConfigParseException {
		//if (!(item instanceof SwitchItem || item instanceof DimmerItem)) {
		//	throw new BindingConfigParseException("item '" + item.getName()
		//			+ "' is of type '" + item.getClass().getSimpleName()
		//			+ "', only Switch- and DimmerItems are allowed - please check your *.items configuration");
		//}
	}
	
	/**
	 * {@inheritDoc}
	 */
	@Override
	public void processBindingConfiguration(String context, Item item, String bindingConfig) throws BindingConfigParseException {
		super.processBindingConfiguration(context, item, bindingConfig);
		SunnyWebBoxBindingConfig config = new SunnyWebBoxBindingConfig();
		
		String[] values = bindingConfig.split(",");
		config.deviceId = values[0];
		config.meta = values[1];
		if(values.length>2)
		{
			config.urlKey = values[2];
		}
		
		addBindingConfig(item, config);		
	}
	
	
	class SunnyWebBoxBindingConfig implements BindingConfig {
		// put member fields here which holds the parsed values
		String deviceId;
		String meta;
		String urlKey;
		
	}

	@Override
	public String getDeviceId(String itemName) {
		SunnyWebBoxBindingConfig config = (SunnyWebBoxBindingConfig) bindingConfigs.get(itemName);
		return config != null ? config.deviceId : null;
	}
	
	@Override
	public String getMeta(String itemName) {
		SunnyWebBoxBindingConfig config = (SunnyWebBoxBindingConfig) bindingConfigs.get(itemName);
		return config != null ? config.meta : null;
	}
	
	@Override
	public String getUrlKey(String itemName) {
		SunnyWebBoxBindingConfig config = (SunnyWebBoxBindingConfig) bindingConfigs.get(itemName);
		return config != null ? config.urlKey : null;
	}
	
	
}
