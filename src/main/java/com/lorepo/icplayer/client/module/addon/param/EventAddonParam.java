package com.lorepo.icplayer.client.module.addon.param;

import com.google.gwt.xml.client.Element;
import com.google.gwt.xml.client.XMLParser;
import com.lorepo.icf.properties.IEventProperty;
import com.lorepo.icf.properties.IProperty;
import com.lorepo.icf.utils.StringUtils;
import com.lorepo.icf.utils.XMLUtils;
import com.lorepo.icplayer.client.module.addon.AddonModel;

public class EventAddonParam extends StringAddonParam{


	public EventAddonParam(AddonModel parent, String type) {
		super(parent, type);
	}


	@Override
	public Element toXML(){
		
		String xml;
		
		xml = "<property";
		xml += " name='" + StringUtils.escapeXML(name) + "'";
		xml += " displayName='" + StringUtils.escapeXML(displayName) + "'";
		xml += " type='" + StringUtils.escapeXML(type) + "'";
		xml += ">";
		
		String singleLine = value.replace("\n", "\\n");
		xml += StringUtils.escapeXML(singleLine);
		xml += "</property>";
		
		return XMLParser.parse(xml).getDocumentElement();
	}


	@Override
	public void load(Element element, String baseUrl) {
		name = XMLUtils.getAttributeAsString(element, "name");
		displayName = XMLUtils.getAttributeAsString(element, "displayName");
		type = XMLUtils.getAttributeAsString(element, "type");
		String rawText = XMLUtils.getText(element);
		rawText = rawText.replace("\\n", "\n");
		value = StringUtils.unescapeXML(rawText);
	}

	
	@Override
	public IProperty getAsProperty() {

		IProperty property = new IEventProperty() {
			
			public void setValue(String newValue) {
				value = newValue;
				sendPropertyChangedEvent(this);
			}
			
			public String getValue() {
				return value;
			}
			
			public String getName() {
				return name;
			}
			
			public String getDisplayName() {
				return displayName;
			}

			@Override
			public boolean isDefault() {
				return false;
			}
		};
		
		return property;
	}


	@Override
	public IAddonParam makeCopy() {
		
		IAddonParam param = new EventAddonParam(getAddonModel(), type);
		param.setName(name);
		param.setDisplayName(displayName);
		return param;
	}
}
