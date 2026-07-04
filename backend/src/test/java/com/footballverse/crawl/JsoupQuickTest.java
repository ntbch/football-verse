package com.footballverse.crawl;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.jsoup.nodes.Document;

/**
 * Temporary test to debug jsoup Safelist behavior. Remove after diagnosis.
 */
public class JsoupQuickTest {
    public static void main(String[] args) {
        // Simple relaxed only
        Safelist base = Safelist.relaxed();
        System.out.println("base: " + Jsoup.clean("<img src=\"x\" onerror=\"alert(1)\">", "", base));

        // Just add img src protocol
        Safelist a = Safelist.relaxed();
        a = a.addProtocols("img", "src", "http", "https");
        System.out.println("addProtocols: " + Jsoup.clean("<img src=\"x\" onerror=\"alert(1)\">", "", a));

        // removeAttributes img srcset
        Safelist b = Safelist.relaxed();
        b = b.removeAttributes("img", "srcset");
        System.out.println("remove srcset: " + Jsoup.clean("<img src=\"x\" onerror=\"alert(1)\">", "", b));

        // removeProtocols
        Safelist c = Safelist.relaxed();
        c = c.removeProtocols("img", "src", "javascript");
        System.out.println("removeProtocols: " + Jsoup.clean("<img src=\"x\" onerror=\"alert(1)\">", "", c));

        // chain add + remove
        Safelist d = Safelist.relaxed();
        d = d.removeProtocols("img", "src", "javascript");
        d = d.addProtocols("img", "src", "http", "https");
        System.out.println("remove then add: " + Jsoup.clean("<img src=\"x\" onerror=\"alert(1)\">", "", d));
    }
}