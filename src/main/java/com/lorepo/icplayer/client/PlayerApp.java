package com.lorepo.icplayer.client;

import java.util.ArrayList;
import java.util.HashMap;

import com.google.gwt.user.client.ui.RootPanel;
import com.lorepo.icf.utils.ILoadListener;
import com.lorepo.icf.utils.JSONUtils;
import com.lorepo.icf.utils.JavaScriptUtils;
import com.lorepo.icf.utils.URLUtils;
import com.lorepo.icf.utils.XMLLoader;
import com.lorepo.icf.utils.dom.DOMInjector;
import com.lorepo.icplayer.client.model.Content;
import com.lorepo.icplayer.client.module.api.player.IPlayerServices;
import com.lorepo.icplayer.client.module.api.player.IScoreService;
import com.lorepo.icplayer.client.ui.PlayerView;

/**
 * Create single page application
 */
public class PlayerApp{

	/** Div id */
	private String divId;
	private	Content contentModel;
	private PlayerController playerController;
	/** Score service impl */
	private PlayerEntryPoint entryPoint;
	private int startPageIndex = 0;
	private HashMap<String, String> loadedState;
	private boolean bookMode = false;
	private boolean showCover = false;
	private String analyticsId = null;
	private ArrayList<Integer> pagesSubset = null;
	private boolean isStaticHeader = false;
	
	public PlayerApp(String id, PlayerEntryPoint entryPoint){
		
		this.divId = id;
		this.entryPoint = entryPoint;
	 }

	
	/**
	 * Get global score service
	 * @return
	 */
	public IScoreService getScoreService() {
		return playerController.getScoreService();
	}

	/**
	 * Load content from given URL
	 * @param url
	 * @param pageIndex 
	 */
	public void load(String url, int pageIndex) {
		startPageIndex = pageIndex;
		contentModel = new Content();
		if (pagesSubset != null) contentModel.setPageSubset(pagesSubset);
		XMLLoader reader = new XMLLoader(contentModel);
		reader.load(url, new ILoadListener() {
			public void onFinishedLoading(Object obj) {
				initPlayer();
			}
			public void onError(String error) {
				JavaScriptUtils.log("Can't load:" + error);
			}
		});
	}

	public void setPages(String pagesSub) {
		ArrayList<Integer> selectedPages = new ArrayList<Integer>();
		String[] parts = null;
		if (pagesSub == null || pagesSub.isEmpty())
			throw new IllegalArgumentException();
		parts = pagesSub.split(",");
		for (int i = 0; i < parts.length; i++) {
			selectedPages.add(Integer.valueOf(parts[i]));
		}
		if (selectedPages.size() > 0)
			pagesSubset = selectedPages;
	}
	
	public void setAnalytics(String id) {
		analyticsId = id;
	}

	public static native int getScreenHeight() /*-{
		return $wnd.innerHeight;
	}-*/;
	
	public static native int getPageHeight() /*-{
		return $wnd.$(".ic_page").css("height").replace("px","");
	}-*/;
	
	public static native void removeStaticFooter() /*-{
		$wnd.$(".ic_footer").parent().removeClass("ic_static_footer");
	}-*/;
	
	public static native void setPageTopAndStaticHeader(int top) /*-{
	  var page = $wnd.$(".ic_page");
	  page.css("top", top);
	  $wnd.$(".ic_header").parent().addClass("ic_static_header");
	  var pageWidth = page.css("width");
	  $wnd.$(".ic_static_header").css("width", pageWidth);
	  
	  if ($wnd.location !== $wnd.parent.location){
	  	var referrer = $doc.referrer;
	  	if(referrer.indexOf($wnd.location.origin) > -1){
		  $wnd.parent.addEventListener('scroll', function () {
		  	var parentScroll = $wnd.parent.scrollY;
		  	var offsetIframe = $wnd.parent.$('iframe').offset().top;
		  	if(parentScroll > offsetIframe){
		 		$wnd.$(".ic_static_header").css("top", parentScroll-offsetIframe);
		  	}else{
				$wnd.$(".ic_static_header").css("top", 0);
		  	}
		  });
	  	}
	  }else{	  
		  var logoHeight = $wnd.$("#_icplayer").offset().top;
		  if(logoHeight > 0){
			 $wnd.addEventListener('scroll', function () {
			  	var scroll = $wnd.scrollY;
			  	if(scroll < logoHeight){
			  		$wnd.$(".ic_static_header").css("top", logoHeight-scroll);
			  	}else{
			  		$wnd.$(".ic_static_header").css("top", 0);
			  	}
			  });
		  }else{
		  	$wnd.$(".ic_static_header").css("top", 0);
		  }
	  }

	  var pageHeight = page.css("height").replace("px","");
	  $wnd.$(".ic_content").parent().css("height", parseInt(pageHeight, 10)+parseInt(top, 10));
	}-*/;
	
	public static native void setStaticFooter(int headerHeight, boolean isHeaderStatic) /*-{
	  var footer = $wnd.$(".ic_footer"),
	  	  page = $wnd.$(".ic_page");
	  footer.parent().addClass("ic_static_footer");
	  var pageWidth = page.css("width");
	  $wnd.$(".ic_static_footer").css("width", pageWidth);
	  footer.css("top", 0);
	  
	  var pageHeight = page.css("height").replace("px","");
	  var icFooterHeight = footer.css("height").replace("px","");
	  page.css("height", parseInt(pageHeight, 10)+parseInt(icFooterHeight, 10));

	  if ($wnd.location !== $wnd.parent.location){
	  	var referrer = $doc.referrer;
	  	if(referrer.indexOf($wnd.location.origin) > -1){
	  	var offsetIframe = $wnd.parent.$('#_icplayer').offset().top;
	  	var sum = parseInt(window.top.innerHeight, 10)-offsetIframe-parseInt(icFooterHeight, 10);
	  	$wnd.$(".ic_static_footer").css("top", sum+"px");
		  $wnd.parent.addEventListener('scroll', function () {
		  	var parentScroll = $wnd.parent.scrollY;
			sum = parseInt(window.top.innerHeight, 10)-offsetIframe-parseInt(icFooterHeight, 10)+parentScroll;
		  	if(sum >= ($wnd.parent.$('iframe').height()-parseInt(icFooterHeight, 10))){
		  		$wnd.$(".ic_static_footer").css("top", "auto")
		  	}else{
		  		$wnd.$(".ic_static_footer").css("top", sum+"px");
		  	}
		  });
	  	}
	  }else{  
		  var $element = $wnd.$("#_icplayer");
		  var footerHeight = $wnd.$($doc).height() - $element.offset().top - $element.height();
		  
		  $wnd.addEventListener("scroll", function () {
		  	var footerHeight = $wnd.$($doc).height() - $element.offset().top - $element.height();
		  	if(footerHeight > 0){		
			  if ($wnd.$($wnd).scrollTop() + $wnd.$($wnd).height() > $wnd.$($doc).height() - footerHeight){
			  	var scrollBottom = $wnd.$($doc).height() - $wnd.$($wnd).height() - $wnd.$($wnd).scrollTop();
			  	$wnd.$(".ic_static_footer").css("bottom", (footerHeight-scrollBottom)+"px");
			  }else{
			  	$wnd.$(".ic_static_footer").css("bottom", 0);
			  }
		  	}
		  });
	  }
	  if(isHeaderStatic){
	  	var contentHeight = $wnd.$(".ic_content").css("height").replace("px","");
	  	$wnd.$(".ic_content").parent().css("height", parseInt(contentHeight, 10)+parseInt(headerHeight, 10));
	  }
	}-*/;
	
	public static native int getHeaderHeight() /*-{
		return $wnd.$(".ic_header").css("height");
	}-*/;
	
	public void makeHeaderStatic() {
		//int headerHeight = contentModel.getHeader().getHeight();
		int headerHeight = getHeaderHeight();
		setPageTopAndStaticHeader(headerHeight);
		isStaticHeader = true;
	}
	
	public void makeFooterStatic() {
		if(getScreenHeight() < getPageHeight()){		
			//int headerHeight = contentModel.getHeader().getHeight();
			int headerHeight = getHeaderHeight();
			setStaticFooter(headerHeight, isStaticHeader);
		}else{
			removeStaticFooter();
		}
	}
	
	/**
	 * Init player after content is loaded
	 */
	private void initPlayer() {
		
		PlayerView playerView = new PlayerView();
		playerController = new PlayerController(contentModel, playerView, bookMode);
		playerController.setFirstPageAsCover(showCover);
		playerController.setAnalytics(analyticsId);
		playerController.addPageLoadListener(new ILoadListener() {
			public void onFinishedLoading(Object obj) {
				entryPoint.onPageLoaded();
				
				if(contentModel.getMetadataValue("staticHeader").compareTo("true") == 0){
					makeHeaderStatic();
				}

				if(contentModel.getMetadataValue("staticFooter").compareTo("true") == 0){
					makeFooterStatic();
				}
			}
			public void onError(String error) {
			}
		});
		
		contentModel.setPlayerController(getPlayerServices());
		
		RootPanel.get(divId).add(playerView);
		String css = URLUtils.resolveCSSURL(contentModel.getBaseUrl(), contentModel.getStyles());
		DOMInjector.appendStyle(css);

		ContentDataLoader loader = new ContentDataLoader(contentModel.getBaseUrl());
		loader.addAddons(contentModel.getAddonDescriptors().values());
		if(contentModel.getHeader() != null){
			loader.addPage(contentModel.getHeader());
		}
		if(contentModel.getFooter() != null){
			loader.addPage(contentModel.getFooter());
		}
		loader.load(new ILoadListener() {
			public void onFinishedLoading(Object obj) {
				loadFirstPage();
			}

			public void onError(String error) {
			}
		});
	}
	
	private void loadFirstPage() {
		if(loadedState != null){
			playerController.getPlayerServices().getStateService().loadFromString(loadedState.get("state"));
			playerController.getPlayerServices().getScoreService().loadFromString(loadedState.get("score"));
		}
		playerController.initHeaders();
		playerController.switchToPage(startPageIndex);
	}


	public IPlayerServices getPlayerServices() {
		return playerController.getPlayerServices();
	}
	
	public void updateScore() {
		playerController.updateScore();
	}
	

	public void setState(String state) {
		HashMap<String, String> data = JSONUtils.decodeHashMap(state);
		if(data.containsKey("state") && data.containsKey("score")){
			loadedState = data;
		}
	}

	public String getState() {
		playerController.updateState();
		String state = playerController.getPlayerServices().getStateService().getAsString();
		String score = playerController.getPlayerServices().getScoreService().getAsString();
		HashMap<String, String> data = new HashMap<String, String>();
		data.put("state", state);
		data.put("score", score);
		return JSONUtils.toJSONString(data);
	}


	public void setBookMode() {
		bookMode = true;
	}


	public void showCover(boolean show) {
		showCover = show;
	}
}
