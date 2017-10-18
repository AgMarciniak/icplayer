package com.lorepo.icplayer.client.module.text;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import java.util.Iterator;

import org.junit.Test;

import com.googlecode.gwt.test.GwtModule;
import com.googlecode.gwt.test.GwtTest;
import com.lorepo.icplayer.client.module.text.GapInfo;
import com.lorepo.icplayer.client.module.text.LinkInfo;
import com.lorepo.icplayer.client.module.text.TextParser;
import com.lorepo.icplayer.client.module.text.TextParser.ParserResult;

@GwtModule("com.lorepo.icplayer.Icplayer")
public class GWTTextParserTestCase extends GwtTest{

	@Test
	public void gapMath5() {
		
		TextParser parser = new TextParser();
		String srcText ="\\gap{\\(f(x)=\\frac{x}{|x|}\\)}";
		
		parser.setId("xcf");
		parser.setUseDraggableGaps(true);
		ParserResult parsed = parser.parse(srcText);
		
		assertEquals(1, parsed.gapInfos.size());

		GapInfo gi = parsed.gapInfos.get(0);
		assertTrue(gi.isCorrect("\\(f(x)=\\frac{x}{|x|}\\)"));
	}
	

	@Test
	public void testLinks() {
		
		TextParser parser = new TextParser();
		String srcText ="This is [[page1|Link do strony 1]] and [[page2|Link do strony 2]]";
		String expectedText ="This is <a id='xcf-1' class='ic_definitionLink' href='javascript:void(0);'>Link do strony 1</a> and <a id='xcf-2' class='ic_definitionLink' href='javascript:void(0);'>Link do strony 2</a>";
		
		parser.setId("xcf");
		ParserResult parsedText = parser.parse(srcText);
		Iterator<LinkInfo> it = parsedText.linkInfos.iterator();
		expectedText = expectedText.replace("'xcf-1'", "'" + it.next().getId() + "'");
		expectedText = expectedText.replace("'xcf-2'", "'" + it.next().getId() + "'");
		
		assertEquals(expectedText, parsedText.parsedText);
	}

	@Test
	public void formattedLink() {
		
		TextParser parser = new TextParser();
		String srcText ="This is [[<span id='result_box' class='short_text' lang='en'><span class='hps'>Page1</span><span class='hps'></span></span>|Link do strony 1]]";
		
		parser.setId("xcf");
		ParserResult parsedText = parser.parse(srcText);

		Iterator<LinkInfo> it = parsedText.linkInfos.iterator();
		assertTrue(it.hasNext());
		LinkInfo info = it.next();
		assertEquals("Page1", info.getHref());
	}

	@Test
	public void testExternalLinks() {
		
		TextParser parser = new TextParser();
		String srcText ="This is [[page1|pageLink1]] and <a href='http://www.google.com'>externalLink1</a>. This is  [[page2|pageLink2]] and <a href='http://www.gwtproject.org/'>externalLink2</a>";
		String expectedText ="This is <a id='xcf-1' class='ic_definitionLink' href='javascript:void(0);'>pageLink1</a> and <a id='xcf-3' target='_blank' href='http://www.google.com'>externalLink1</a>. This is <a id='xcf-2' class='ic_definitionLink' href='javascript:void(0);'>pageLink2</a> and <a id='xcf-4' target='_blank' href='http://www.gwtproject.org/'>externalLink2</a>";
		
		parser.setId("xcf");
		ParserResult parsedText = parser.parse(srcText);
		Iterator<LinkInfo> it = parsedText.linkInfos.iterator();
		expectedText = expectedText.replace("'xcf-3'", "'" + it.next().getId() + "'");
		expectedText = expectedText.replace("'xcf-4'", "'" + it.next().getId() + "'");
		expectedText = expectedText.replace("'xcf-1'", "'" + it.next().getId() + "'");
		expectedText = expectedText.replace("'xcf-2'", "'" + it.next().getId() + "'");

		assertEquals(expectedText, parsedText.parsedText);
	}
	
	@Test
	public void testExternalLinksWithSpecialCharacters() {
		
		TextParser parser = new TextParser();
		String srcText ="This is <a href='https://www.google.pl/search?q=lorem+ipsum&oq=lorem+ipsum&aqs=chrome..69i57j0l5.2695j0j7&sourceid=chrome&espv=210&es_sm=93&ie=UTF-8'>externalLink1</a>.";
		String expectedText ="This is <a id='xcf-1' target='_blank' href='https://www.google.pl/search?q=lorem+ipsum&oq=lorem+ipsum&aqs=chrome..69i57j0l5.2695j0j7&sourceid=chrome&espv=210&es_sm=93&ie=UTF-8'>externalLink1</a>.";
		
		parser.setId("xcf");
		ParserResult parsedText = parser.parse(srcText);
		Iterator<LinkInfo> it = parsedText.linkInfos.iterator();
		expectedText = expectedText.replace("'xcf-1'", "'" + it.next().getId() + "'");

		assertEquals(expectedText, parsedText.parsedText);
	}
	
	@Test
	public void testGap1() {
		
		TextParser parser = new TextParser();
		String srcText ="\\gap{answer1|answer2|answer3} \\gap{answer1|answer2|answer3}";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText);
		
		assertEquals(2, parsed.gapInfos.size());

	}

	@Test
	public void testGap3() {
		
		TextParser parser = new TextParser();
		String srcText ="\\gap{1:answer1|}";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText);
		
		assertEquals(1, parsed.gapInfos.size());

		GapInfo gi = parsed.gapInfos.get(0);
		assertTrue(gi.isCorrect("1:answer1"));
	}
	
	
	@Test
	public void testDefinition1() {
		
		TextParser parser = new TextParser();
		String srcText ="\\def{słówko1} \\def{słówko2}";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText);
		
		assertEquals(2, parsed.linkInfos.size());

	}

	@Test
	public void testDefinition2() {
		
		TextParser parser = new TextParser();
		String srcText ="\\def{słówko1} \\def{słówko2}";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText);
		
		int index = parsed.parsedText.indexOf("słówko1");
		assertTrue(index > 0);
	}

	@Test
	public void testDefinition3() {
		
		TextParser parser = new TextParser();
		String srcText ="\\def{abc|słówko1} \\def{słówko2}";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText);
		
		int index = parsed.parsedText.indexOf(">słówko1</a>");
		assertTrue(index > 0);
	}


	/**
	 * Wrong syntax should be correctly parsed.
	 */
	@Test
	public void wrongSyntax() {
		
		TextParser parser = new TextParser();
		String srcText ="{{1 {{1:7200}}";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText);
		
		assertEquals("#ERROR#", parsed.parsedText);
	}

	@Test
	public void skipGapInMath() {
		
		TextParser parser = new TextParser();
		parser.setUseDraggableGaps(true);
		String srcText ="\\(\\sqrt {{x^{10}}{y^8}} = \\sqrt {{x^{10}}}\\)";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText);

		assertEquals("\\(\\sqrt {{x^{10}}{y^8}} = \\sqrt {{x^{10}}}\\)", parsed.parsedText);
	}

	@Test
	public void skipGapInMath2() {
		
		TextParser parser = new TextParser();
		parser.setUseDraggableGaps(true);
		String srcText ="This is \\(\\cfrac{{1}}{10^4}\\) not a gap";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText);

		assertEquals("This is \\(\\cfrac{{1}}{10^4}\\) not a gap", parsed.parsedText);
	}

	@Test
	public void skipGaps() {
		TextParser parser = new TextParser();
		parser.skipGaps();
		String srcText ="This is {{2:ala}} and \\def{słówko1}";
		ParserResult parsed = parser.parse(srcText);
		
		assertEquals(1, parsed.linkInfos.size());
		assertTrue(parsed.parsedText.indexOf("{{2:ala}}") > 0);
	}
	
	public void parserIsInEditorModeAndAddAdditionalInformationsToElements() {
		TextParser parser = new TextParser();
		String srcText ="[[page1|Link do strony 1]] \\gap{answer1|answer2|answer3} \\gap{answer1|answer2|answer3} \\filledGap{initial text|answer} \\def{słowko1}";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText, true);
		
		assertTrue(parsed.parsedText.indexOf("data-gap-value=\"\\gap{answer1|answer2|answer3}\"") > -1);
		assertTrue(parsed.parsedText.indexOf("data-gap-value=\"\\filledGap{initial text|answer}\"") > -1);
		assertTrue(parsed.parsedText.indexOf("data-gap-value='\\def{słowko1}'") > -1);
	}
	
	@Test
	public void parserIsNotInEditorModeWillNotAddAdditionalInformation () {
		TextParser parser = new TextParser();
		String srcText ="[[page1|Link do strony 1]] \\gap{answer1|answer2|answer3} \\gap{answer1|answer2|answer3} \\filledGap{initial text|answer} \\def{słowko1}";
		
		parser.setId("xcf");
		ParserResult parsed = parser.parse(srcText, false);
		
		assertTrue(parsed.parsedText.indexOf("data-gap-value=\"\\gap{answer1|answer2|answer3}\"") == -1);
		assertTrue(parsed.parsedText.indexOf("data-gap-value=\"\\filledGap{initial text|answer}\"") == -1);
		assertTrue(parsed.parsedText.indexOf("data-gap-value='\\def{słowko1}'") == -1);		
	}
	
	@Test
	public void gettingRawText () {
		TextParser parser = new TextParser();
		
		String inText = "<div>The sun is &nbsp;{{1:yellow 1|green 2|blue 3}}.</div><div>The grass is &nbsp;{{1:green 1|pink 2|black 3}}.</div>";
		String expectedResult = "The sun is #2#.The grass is #2#.";
		assertEquals(expectedResult, parser.getRawTextSource(inText));
		
		inText = "Hello \\gap{answer} hello2 \\gap{answer}";
		expectedResult = "Hello #1# hello2 #1#";
		assertEquals(expectedResult, parser.getRawTextSource(inText));
		
		inText = "Text Module can be used for gap filling activities.<br><ol><li>A dropdown gap: {{1:option 1|option 2|option 3}}.</li><li>An editable or a draggable gap: \\gap{answer}.</li><li>A gap with 2 correct options: \\gap{blue|navy}.</li><li>This is a filled gap: \\filledGap{initialtext|answer} awdnawd.</li></ol>";
		expectedResult = "Text Module can be used for gap filling activities.A dropdown gap: #2#.An editable or a draggable gap: #1#.A gap with 2 correct options: #1#.This is a filled gap: #4# awdnawd.";
		assertEquals(expectedResult, parser.getRawTextSource(inText));
		
//		inText = "Kolejne wielkie wymieranie w \\gap{kredzie} obj�o oko�o \\gap{75%} gatunk�w �yj�cych na Ziemi, w tym \\gap{dinozaury}. Najbardziej prawdopodobn� przyczyn� by�o \\gap{uderzenie planetoidy w} powierzchni� \\gap{oceanu}. Spowodowa�o to wyniesienie do atmosfery wielkiej ilo�ci \\gap{py��w} ograniczaj�cych na d�ugo mo�liwo�� \\gap{fotosyntezy}, a w konsekwencji za�amanie si� \\gap{�a�cuch�w pokarmowych}.";
//		expectedResult = "Kolejne wielkie wymieranie w #1# obj�o oko�o #1# gatunk�w �yj�cych na Ziemi, w tym #1#. Najbardziej prawdopodobn� przyczyn� by�o #1# powierzchni� #1#. Spowodowa�o to wyniesienie do atmosfery wielkiej ilo�ci #1# ograniczaj�cych na d�ugo mo�liwo�� #1#, a w konsekwencji za�amanie si� #1#.";
//		assertEquals(expectedResult, parser.getRawTextSource(inText));
	}
}
