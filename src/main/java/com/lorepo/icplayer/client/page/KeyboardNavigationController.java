package com.lorepo.icplayer.client.page;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.dom.client.Document;
import com.google.gwt.event.dom.client.DomEvent;
import com.google.gwt.event.dom.client.KeyCodes;
import com.google.gwt.event.dom.client.KeyDownEvent;
import com.google.gwt.event.dom.client.KeyDownHandler;
import com.google.gwt.user.client.Element;
import com.google.gwt.user.client.ui.RootPanel;
import com.google.gwt.user.client.ui.Widget;
import com.lorepo.icf.utils.JavaScriptUtils;
import com.lorepo.icplayer.client.PlayerEntryPoint;
import com.lorepo.icplayer.client.module.api.IModuleModel;
import com.lorepo.icplayer.client.module.api.IModuleView;
import com.lorepo.icplayer.client.module.api.IPresenter;
import com.lorepo.icplayer.client.module.api.event.ModuleActivatedEvent;
import com.lorepo.icplayer.client.module.api.player.IPlayerServices;
import com.lorepo.icplayer.client.module.choice.ChoiceView;
import com.lorepo.icplayer.client.module.text.TextPresenter;
import com.lorepo.icplayer.client.module.text.TextView;

public final class KeyboardNavigationController {
	private int focusedModule = 0;
	private String currentModuleName = "";
	private boolean moduleIsActivated = false;
	private HashMap<String, Widget> navigationWidgets = new HashMap<String, Widget>();
	private List<String> modulesNames = new ArrayList<String>();
	private List<String> tempModulesNames = new ArrayList<String>();
	private HashMap<String, List<String>> pageModules = new HashMap<String, List<String>>();
	private List<String> headerNames = new ArrayList<String>();
	private boolean isInitiated = false;
	private HashMap<String, IPlayerServices> playerServices = new HashMap<String, IPlayerServices>();
	private List<String> headerWidgets = new ArrayList<String>();
	private List<String> footerWidgets = new ArrayList<String>();
	private List<String> mainPageWidgets = new ArrayList<String>();
	private List<String> bookPageWidgets = new ArrayList<String>();
	private boolean modeOn = false;
	private PlayerEntryPoint entryPoint;
	private PageController mainPageController;
	private JavaScriptObject invisibleInputForFocus = null;

	private enum ExpectedModules {
		// Navigation modules
		text, video, button, navigation_bar, choice, show_answers, checkbutton, truefalse, gamememo, sourcelist, double_state_button, single_state_button, ordering, connection, multiplegap, table, text_identification;
		
		private static boolean contains(String s) {
			s = s.replaceAll("\\s","");

			for (ExpectedModules choice:values()) {
				if (choice.name().equals(s)) {
					return true; 
				}
			}
			return false;
		}
	}
	
	public KeyboardNavigationController() {
		this.waitOnMessages(this);
	}
	
	private void callEnterPressEvent () {
		DomEvent.fireNativeEvent(Document.get().createKeyDownEvent(false, false, true, false, KeyCodes.KEY_ENTER), RootPanel.get());
	}
	
	private native void waitOnMessages (KeyboardNavigationController x) /*-{
		$wnd.addEventListener("message", receiveMessage);
		function receiveMessage(event) {
			try {
				var eventData = JSON.parse(event.data);
				
				if (eventData.type !== "EXTERNAL_KEYDOWN_WATCHER") {
					return; 
				}
				
				var keyCode = eventData.keyCode;
				var isShift = eventData.isShift;
				if (keyCode == 13 && isShift) {
					x.@com.lorepo.icplayer.client.page.KeyboardNavigationController::callEnterPressEvent()();
				}
			} catch (e) {
			}			
		}
	}-*/;
	
	private void initialSelect() {
		if (modulesNames.size() == 0) return; // None of navigation modules on page
		
		String moduleName = modulesNames.get(0);
		Widget w = navigationWidgets.get(moduleName);
		
		if (w == null) return; // there is no modules to select
		
		selectModule(moduleName);
		currentModuleName = moduleName;
		isInitiated = true;
		
		setModuleStatus(moduleName, true, false);
	}
	
	// we must update this position because each of page has different number of modules
	private void updateFocusedModulePosition() {
		for (int i = 0; i < modulesNames.size(); i++) {
			if (modulesNames.get(i).equals(currentModuleName)) {
				focusedModule = i;
			}
		}
	}
	
	public void fillModulesNamesList() {
		modulesNames.clear();
		if (!headerWidgets.isEmpty()) {
			modulesNames.addAll(headerWidgets);
		}

		if (!mainPageWidgets.isEmpty()) {
			modulesNames.addAll(mainPageWidgets);
		}
		
		if (!bookPageWidgets.isEmpty()) {
			modulesNames.addAll(bookPageWidgets);
		}
		
		if (!footerWidgets.isEmpty()) {
			modulesNames.addAll(footerWidgets);
		}

		if (!currentModuleName.equals("")) {
			selectModule(currentModuleName);
			activateModule();
			updateFocusedModulePosition();
		}
	}
	
	private boolean isModuleInBookView(String moduleName) {
		return moduleName.length() >= 5 && moduleName.charAt(2) == 'b';
	}
	
	// Sometimes modules can remove classes just activated or selected modules. We must restore them.
	private void restoreClasses() {
		if (!modeOn) return;
		
		Widget currentWidget = navigationWidgets.get(currentModuleName);

		if (currentWidget != null) {
			currentWidget.getElement().addClassName("ic_selected_module");
			
			if (moduleIsActivated) {
				currentWidget.getElement().addClassName("ic_active_module");
			}
		}
	}
	
	private boolean isModuleButton() {
		Widget currentWidget = navigationWidgets.get(currentModuleName);
		
		if (currentWidget!= null) {
			return currentWidget.getElement().getAttribute("role").equals("button");
		}
		
		return false;
	}

	public void run(PlayerEntryPoint entry) {
		entryPoint = entry;

		RootPanel.get().addDomHandler(new KeyDownHandler() {
			@Override
	        public void onKeyDown(KeyDownEvent event) {
				// ON and OFF navigation
				if (event.getNativeKeyCode() == KeyCodes.KEY_ENTER && event.isShiftKeyDown()) {
					modeOn = !modeOn;
					event.preventDefault();

					if (!modeOn) { // off
						sendEvent(event);
						deactivateModule();
						deselectModule(currentModuleName);
					} else { // on
						setFocusOnDefaultElement();
						if (!isInitiated) {
							initialSelect();
						} else {
							selectModule(currentModuleName);
						}
					}

					return;
				}
				
				// Skipping between modules
	            if (modeOn && event.getNativeKeyCode() == KeyCodes.KEY_TAB) {
	            	event.preventDefault();
	            	
	            	if (!isInitiated) {
	            		initialSelect();
	            		return;
	            	}
	            	
	            	if (!moduleIsActivated || isModuleButton()) {
	            		moduleIsActivated = false; // If button module is activated and we skip to the other button, let's deactivate it
	            		if (event.isShiftKeyDown()) {
	            			selectPreviousModule();
	            		} else {
	            			selectNextModule();
	            		}
	            	}
	            }

	            // Activate module on Enter key
	            if (modeOn && event.getNativeKeyCode() == KeyCodes.KEY_ENTER) {
	            	event.preventDefault();
	            	activateModule();
	            }
	            
	            // Send event
	            if (modeOn && moduleIsActivated) {
	            	sendEvent(event);
	            }
	            
	            // Deactive module
	            if (modeOn && event.getNativeKeyCode() == KeyCodes.KEY_ESCAPE) {
	            	event.preventDefault();
	            	deactivateModule();
	            }
	            
	            restoreClasses();
	        }
	    }, KeyDownEvent.getType());
	}
	
	private void setFocusOnDefaultElement () {
		this.focusElement(this.getInputElement());
	} 
		
	private native JavaScriptObject	getInputElement() /*-{
		var input = $wnd.$("#input_element_for_focus_to_change_focused_element_by_browser").get(0);
		if (!input) {
			input = $wnd.$("<input/>");
			input.attr("id", "input_element_for_focus_to_change_focused_element_by_browser");
			input.css({
				"opacity": 0.0001,
				"pointer-events": "none",
				"position": "absolute",
				"top": "0px"
			});
			var body = $wnd.$("body");
			body.append(input);
		}
		
		return input;		
	}-*/;
	
	private native void focusElement(JavaScriptObject element) /*-{
		element.focus();
	}-*/;
	
	private void sendEvent (KeyDownEvent event) {
		boolean isModuleInBookView = isModuleInBookView(currentModuleName);
    	String moduleName = currentModuleName.substring(5, currentModuleName.length());

    	if (isModuleInBookView && playerServices.containsKey("BookMode")) {
    		playerServices.get("BookMode").getEventBus().fireEvent(new ModuleActivatedEvent(moduleName, event));
    	} else {
    		playerServices.get("SingleMode").getEventBus().fireEvent(new ModuleActivatedEvent(moduleName, event));
    	}
	}

	private void activateModule() {
		if (currentModuleName.isEmpty()) return;

		Widget widget = navigationWidgets.get(currentModuleName);
		widget.getElement().addClassName("ic_active_module");
		if (currentModuleName.substring(0, 5) == "__m__") {
			playTextToSpeechContent(widget);
		}
		
		this.moduleIsActivated = true;
		setModuleStatus(currentModuleName, true, true);
	}
	
	private void deselectModule(String currentModuleName) {
		if (currentModuleName.isEmpty()) return;

		Widget currentWidget = navigationWidgets.get(currentModuleName);
		currentWidget.getElement().removeClassName("ic_selected_module");
		currentWidget.getElement().removeClassName("ic_active_module");
	}
	
	private void deactivateModule() {
		if (currentModuleName.isEmpty()) return;
		
		Widget currentWidget = navigationWidgets.get(currentModuleName);
		currentWidget.getElement().removeClassName("ic_active_module");
		
		this.moduleIsActivated = false;
		setModuleStatus(currentModuleName, true, false);
	}
	
	private void selectPreviousModule() {
		deselectModule(currentModuleName);
		int position = --focusedModule % navigationWidgets.size();
		
		if (position < 0) {
			position = navigationWidgets.size() - 1;
			focusedModule = navigationWidgets.size() - 1;
		}
		
		String moduleName = modulesNames.get(position);
		Widget w = navigationWidgets.get(moduleName);
		
		if (w == null) return; // there is no modules to select
		
		// skip hidden modules
		int i = 0;
		while (w.getElement().getStyle().getVisibility().equals("hidden")) {
			if (i++ == position) break; // if all modules are hidden then break loop
			focusedModule--;
			position = focusedModule % navigationWidgets.size();
			if (position == 0) {
				position = navigationWidgets.size() - 1;
			}
			moduleName = modulesNames.get(position);
			w = navigationWidgets.get(moduleName);
		}
		
		selectModule(moduleName);
		setModuleStatus(moduleName, true, false);
	}
	
	private boolean isModuleHidden(Element elem) {
		return elem.getStyle().getVisibility().equals("hidden") || elem.getStyle().getDisplay().equals("none");
	}
	
	private void selectNextModule() {
		deselectModule(currentModuleName);
		
		int position = ++focusedModule % navigationWidgets.size();
		String moduleName = modulesNames.get(position);
		Widget w = navigationWidgets.get(moduleName);
		int i = 0;

		if (w == null) return; // there is no modules to select
		
		// skip hidden modules
		while (isModuleHidden(w.getElement())) {
			if (i++ == position) break; // if all modules are hidden then break loop
			focusedModule++;
			position = focusedModule % navigationWidgets.size();
			moduleName = modulesNames.get(position);
			w = navigationWidgets.get(moduleName);
		}

		selectModule(moduleName);
		setModuleStatus(moduleName, true, false);
	}
	
	private static native void firePageLoaded(JavaScriptObject callback) /*-{
		if (callback != null) {
			callback();
		}
	}-*/;
	
	private void selectModule(String moduleName) {
		currentModuleName = moduleName;
		Widget widget = navigationWidgets.get(moduleName);
		widget.getElement().addClassName("ic_selected_module");

		entryPoint.onScrollTo(widget.getAbsoluteTop());
		
		if (moduleName.substring(0, 5) == "__m__") {
			mainPageController.playTitle(moduleName.substring(5));
		}
	}
	
	private boolean isCommonModule() { 
		return currentModuleName.charAt(2) == 'h' || currentModuleName.charAt(2) == 'f';
	}
	
	public void resetStatus() {
		if (!isCommonModule()) {
			setModuleStatus("", false, false);
		}
	}
	
	// True, if no module is activated
	private static native boolean shouldSelectModule() /*-{
		return typeof $wnd.moduleStatus.name !== "";
	}-*/;

	public static native void setModuleStatus(String name, boolean selected, boolean activated) /*-{
		name = name.substring(5, name.length);
		
		$wnd.moduleStatus = {
			name: name,
			selected: selected,
			activated: activated
		}
	}-*/;
	
	public boolean isModuleActivated() {
		return moduleIsActivated;
	}
	
	public void reset() {
		if (!(isCommonModule() && isModuleActivated())) {
			focusedModule = 0;
			currentModuleName = "";
			moduleIsActivated = false;
			isInitiated = false;
		}

		headerWidgets.clear();
		footerWidgets.clear();
		mainPageWidgets.clear();
		bookPageWidgets.clear();
		
		navigationWidgets = new HashMap<String, Widget>();
		modulesNames = new ArrayList<String>();
	}
	
	public void setPlayerService(IPlayerServices ps, boolean isBookMode) {
		playerServices.put(isBookMode ? "BookMode" : "SingleMode", ps);
	}
	
	protected List<String> sortModulesFromTextToSpeech (List<String> modulesNamesFromPage, List<String> modulesNamesFromTTS) {
		final String mainPagePrefix = "__m__";
		
		for (int i=0; i<modulesNamesFromTTS.size(); i++) {
			String mn = mainPagePrefix + modulesNamesFromTTS.get(i);
			modulesNamesFromTTS.set(i, mn);
			
			if (modulesNamesFromPage.contains(mn)) {
				modulesNamesFromPage.remove(mn);
			}
		}
		
		modulesNamesFromTTS.addAll(modulesNamesFromPage);
		
		return modulesNamesFromTTS;
	}
	
	private List<String> getProperModulesToList(List<IPresenter> presenters, HashMap<String, Widget> widgets, String prefix, boolean isMainPage) {
		List<String> tempModulesNames = new ArrayList<String>();

		for (IPresenter presenter: presenters) {
			IModuleModel module = presenter.getModel();
			String moduleTypeName = module.getModuleTypeName().toLowerCase();
			boolean isModuleExpected = ExpectedModules.contains(moduleTypeName);
			
			if (isModuleExpected) {
				// for text modules
				if (moduleTypeName.equals("text")) {
					TextPresenter textPresenter = (TextPresenter) presenter;
					
					if (!textPresenter.isSelectable() && !mainPageController.isTextToSpeechModuleEnable()) {
						continue;
					}
				}
				
				tempModulesNames.add(prefix + presenter.getModel().getId());
				navigationWidgets.put(prefix + module.getId(), widgets.get(module.getId()));
			}
		}
		
		if (isMainPage) {
			return sortModulesFromTextToSpeech(tempModulesNames, mainPageController.getModulesOrder());
		}
		
		return tempModulesNames;
	}
	
	private void playTextToSpeechContent (Widget widget) {
		IModuleView imv = (IModuleView) widget;
		
		if (imv.getName() == "Choice") {
			ChoiceView choice = (ChoiceView) widget;
			choice.setPageController(mainPageController);
			choice.setTextToSpeechVoices(mainPageController.getMultiPartDescription(currentModuleName.substring(5)));
		} else if (imv.getName() == "Text") {
			JavaScriptUtils.log("I am in TEXT lets go");
			TextView text = (TextView) widget;
			text.setPageController(mainPageController);
		} else {
			mainPageController.playDescription(currentModuleName.substring(5));
		}
	}
	
	private void addToNavigation(PageController controller, List<String> widgets, String prefix, boolean isMainPage) {
		if (controller != null && controller.getWidgets() != null) {
			widgets.clear();
			List<String> widgetNames = new ArrayList<String>();
			widgetNames = getProperModulesToList(controller.getPresenters(), controller.getWidgets(), prefix, isMainPage);
			widgets.addAll(widgetNames);
		}
	}
	
	public void addHeaderToNavigation (PageController controller) {
		addToNavigation(controller, headerWidgets, "__h__", false);
	}
	
	public void addFooterToNavigation (PageController controller) {
		addToNavigation(controller, footerWidgets, "__f__", false);
	}
	
	public void addMainToNavigation (PageController controller) {
		mainPageController = controller;
		addToNavigation(controller, mainPageWidgets, "__m__", true);
	}
	
	public void addSecondToNavigation (PageController controller) {
		addToNavigation(controller, bookPageWidgets, "__b__", false);
	}
}
