export interface BookOverview {
  section: string;
  author: string;
  timeframe: string;
  theme: string;
  summary: string;
  keyReferences: string[];
}

export const BOOK_OVERVIEWS: Record<string, BookOverview> = {
  GEN: {
    section: 'Pentateuch',
    author: 'Moses',
    timeframe: 'c. 1445–1405 BC',
    theme: 'Beginnings & Covenant Promise',
    summary:
      'Genesis traces creation, humanity’s fall into sin, and God’s covenant with Abraham, Isaac, and Jacob. Through Joseph’s journey in Egypt, it shows how God weaves human failure and suffering into salvation and promise.',
    keyReferences: ['1:1', '3:15', '12:1-3', '50:20'],
  },
  EXO: {
    section: 'Pentateuch',
    author: 'Moses',
    timeframe: 'c. 1445–1405 BC',
    theme: 'Deliverance & Covenant Law',
    summary:
      'Exodus recounts God’s deliverance of Israel from slavery in Egypt through Moses and the Passover lamb. At Mount Sinai, God gives the Ten Commandments and the Tabernacle so His presence can dwell among His redeemed people.',
    keyReferences: ['3:14', '14:13-14', '20:1-3', '34:6-7'],
  },
  LEV: {
    section: 'Pentateuch',
    author: 'Moses',
    timeframe: 'c. 1445–1405 BC',
    theme: 'Holiness & Atonement',
    summary:
      'Leviticus teaches Israel how an unholy people can draw near to a holy God through sacrifice, priesthood, and daily obedience. Its feasts and purity laws point forward to complete atonement and love of neighbor.',
    keyReferences: ['11:45', '16:30', '17:11', '19:18'],
  },
  NUM: {
    section: 'Pentateuch',
    author: 'Moses',
    timeframe: 'c. 1445–1405 BC',
    theme: 'Wilderness Faith & Patience',
    summary:
      'Numbers follows Israel’s forty-year wilderness journey from Sinai to the edge of Canaan, marked by grumbling, unbelief, and discipline. Yet even amid rebellion, God remains faithful to guide, provide, and bless His people.',
    keyReferences: ['6:24-26', '14:18', '21:8-9', '23:19'],
  },
  DEU: {
    section: 'Pentateuch',
    author: 'Moses',
    timeframe: 'c. 1406 BC',
    theme: 'Covenant Renewal & Love',
    summary:
      'In a series of farewell sermons on the plains of Moab, Moses urges the new generation to remember God’s grace and obey His law from the heart. He sets life and blessing before Israel as they prepare to enter the Promised Land.',
    keyReferences: ['6:4-5', '7:9', '30:19', '31:6'],
  },
  JOS: {
    section: 'Historical Books',
    author: 'Joshua',
    timeframe: 'c. 1400–1370 BC',
    theme: 'Courage & Inheritance',
    summary:
      'Joshua chronicles Israel’s crossing of the Jordan, conquest of Canaan, and allotment of the land among the twelve tribes. It demonstrates that God fulfills every promise when His people walk in courageous faith and obedience.',
    keyReferences: ['1:8-9', '6:20', '21:45', '24:15'],
  },
  JDG: {
    section: 'Historical Books',
    author: 'Traditional: Samuel',
    timeframe: 'c. 1050–1000 BC',
    theme: 'Cycles of Grace & Drift',
    summary:
      'Judges records a turbulent era when Israel repeatedly turned to idols, suffered oppression, cried out, and was rescued by flawed deliverers. Its recurring refrain exposes the chaos of living without a righteous king.',
    keyReferences: ['2:16', '6:12', '16:28', '21:25'],
  },
  RUT: {
    section: 'Historical Books',
    author: 'Traditional: Samuel',
    timeframe: 'c. 1010–970 BC',
    theme: 'Loyal Love & Redemption',
    summary:
      'Set during the dark days of the judges, Ruth tells of a Moabite widow whose steadfast devotion to Naomi leads her into the family of Boaz, a kinsman-redeemer. Through ordinary faithfulness, God preserves the lineage of King David.',
    keyReferences: ['1:16', '2:12', '3:11', '4:14'],
  },
  '1SA': {
    section: 'Historical Books',
    author: 'Samuel, Nathan & Gad',
    timeframe: 'c. 1050–930 BC',
    theme: 'Kingship & Heart Obedience',
    summary:
      'First Samuel traces the transition from Israel’s last judge, Samuel, to the rise and tragic fall of King Saul and the anointing of David. It contrasts outward appearances with the humble, trusting heart that God seeks.',
    keyReferences: ['2:2', '15:22', '16:7', '17:45'],
  },
  '2SA': {
    section: 'Historical Books',
    author: 'Nathan & Gad',
    timeframe: 'c. 970–930 BC',
    theme: 'David’s Reign & Covenant',
    summary:
      'Second Samuel follows David’s reign over a united Israel, spotlighting God’s covenant promise of an eternal throne alongside David’s moral failure with Bathsheba. Despite deep family grief, God’s mercy sustains the royal line.',
    keyReferences: ['7:12-13', '12:13', '22:2-3', '24:24'],
  },
  '1KI': {
    section: 'Historical Books',
    author: 'Traditional: Jeremiah',
    timeframe: 'c. 560–540 BC',
    theme: 'Wisdom, Temple & Division',
    summary:
      'First Kings opens with Solomon’s wisdom and the building of the Jerusalem Temple before idolatry splits the nation into northern Israel and southern Judah. Prophets like Elijah confront corrupt kings to call the people back to the one true God.',
    keyReferences: ['3:9', '8:27', '18:21', '19:12'],
  },
  '2KI': {
    section: 'Historical Books',
    author: 'Traditional: Jeremiah',
    timeframe: 'c. 560–540 BC',
    theme: 'Prophetic Warning & Exile',
    summary:
      'Second Kings recounts the decline of both Israel and Judah as persistent idolatry leads to Assyria’s conquest of the north and Babylon’s destruction of Jerusalem. Even amid national ruin, brief revivals and prophetic miracles reveal God’s enduring patience.',
    keyReferences: ['2:9', '6:16', '17:13', '22:19'],
  },
  '1CH': {
    section: 'Historical Books',
    author: 'Traditional: Ezra',
    timeframe: 'c. 450–425 BC',
    theme: 'Worship & David’s Line',
    summary:
      'Written after the Babylonian exile, First Chronicles retells Israel’s story from Adam through King David with special focus on the priesthood and Temple worship. It reminds returning exiles that God’s covenant promises and worship remain intact.',
    keyReferences: ['4:10', '16:34', '28:9', '29:11'],
  },
  '2CH': {
    section: 'Historical Books',
    author: 'Traditional: Ezra',
    timeframe: 'c. 450–425 BC',
    theme: 'Humility, Prayer & Renewal',
    summary:
      'Second Chronicles traces Judah’s kings from Solomon’s glorious Temple dedication to the fall of Jerusalem and the decree allowing the exiles to return. Its recurring message highlights how repentance and seeking the Lord bring spiritual renewal.',
    keyReferences: ['7:14', '16:9', '20:15', '36:23'],
  },
  EZR: {
    section: 'Historical Books',
    author: 'Ezra',
    timeframe: 'c. 440 BC',
    theme: 'Rebuilding & Scripture',
    summary:
      'Ezra chronicles the return of Jewish exiles from Babylon under Zerubbabel and Ezra to rebuild the Temple and restore obedience to God’s Word. Facing opposition and compromise, the community learns that renewal begins with Scripture and prayer.',
    keyReferences: ['3:11', '6:16', '7:10', '9:6'],
  },
  NEH: {
    section: 'Historical Books',
    author: 'Nehemiah & Ezra',
    timeframe: 'c. 430–400 BC',
    theme: 'Resilient Rebuilding',
    summary:
      'Nehemiah leaves a royal post in Persia to rebuild Jerusalem’s shattered walls in fifty-two days despite relentless external threats. Alongside Ezra’s public reading of the Law, the city is physically and spiritually fortified.',
    keyReferences: ['2:18', '4:14', '8:10', '9:6'],
  },
  EST: {
    section: 'Historical Books',
    author: 'Unknown (Mordecai tradition)',
    timeframe: 'c. 460–400 BC',
    theme: 'Unseen Providence',
    summary:
      'Set in the Persian empire, Esther tells how an orphaned Jewish queen risks her life to overturn a genocidal plot against her people. Although God’s name never appears in the text, His providential timing and deliverance shine through every turn.',
    keyReferences: ['4:14', '4:16', '8:16', '9:22'],
  },
  JOB: {
    section: 'Wisdom & Poetry',
    author: 'Unknown',
    timeframe: 'Patriarchal or Solomonic era',
    theme: 'Suffering & Sovereign Wisdom',
    summary:
      'Job wrestles deeply with why the righteous suffer as a blameless man loses family, wealth, and health in a single season. When God finally speaks from the whirlwind, Job discovers peace not in easy answers, but in trusting the Creator’s majesty.',
    keyReferences: ['1:21', '13:15', '19:25', '42:5'],
  },
  PSA: {
    section: 'Wisdom & Poetry',
    author: 'David, Asaph & others',
    timeframe: 'c. 1440–450 BC',
    theme: 'Honest Worship & Lament',
    summary:
      'The Psalms form Israel’s inspired prayer and songbook, spanning raw laments, royal prophecies, gratitude, and soaring praise. They invite believers in every emotional season to bring unfiltered honesty before a faithful Shepherd and King.',
    keyReferences: ['1:1-2', '23:1', '51:10', '119:105'],
  },
  PRO: {
    section: 'Wisdom & Poetry',
    author: 'Solomon, Agur & Lemuel',
    timeframe: 'c. 950–700 BC',
    theme: 'Practical Daily Wisdom',
    summary:
      'Proverbs gathers crisp sayings and fatherly counsel on speech, work, integrity, friendship, and self-control. Anchored in reverence for God, it teaches how moral skill produces flourishing across ordinary life.',
    keyReferences: ['1:7', '3:5-6', '4:23', '16:9'],
  },
  ECC: {
    section: 'Wisdom & Poetry',
    author: 'Traditional: Solomon',
    timeframe: 'c. 935 BC',
    theme: 'Meaning Beyond the Sun',
    summary:
      'The Preacher examines wealth, pleasure, toil, and status under the sun, exposing their fleeting mist-like brevity. His honest inquiry resolves in receiving everyday gifts with gratitude and fearing God as life’s enduring anchor.',
    keyReferences: ['1:2', '3:1', '4:9-10', '12:13'],
  },
  SNG: {
    section: 'Wisdom & Poetry',
    author: 'Solomon',
    timeframe: 'c. 965 BC',
    theme: 'Covenant Love & Delight',
    summary:
      'Song of Solomon celebrates the poetry, longing, and faithful intimacy of marital love between a bride and her beloved. Across Scripture, its vivid imagery also echoes the passionate devotion between God and His people.',
    keyReferences: ['2:16', '6:3', '8:6', '8:7'],
  },
  ISA: {
    section: 'Major Prophets',
    author: 'Isaiah',
    timeframe: 'c. 740–680 BC',
    theme: 'Holy Judgment & Messiah',
    summary:
      'Isaiah warns Judah against empty ritual and political self-reliance while unveiling dazzling visions of God’s holiness. Looking beyond exile, it announces the coming Suffering Servant and a renewed creation filled with peace.',
    keyReferences: ['6:8', '9:6', '40:31', '53:5'],
  },
  JER: {
    section: 'Major Prophets',
    author: 'Jeremiah',
    timeframe: 'c. 627–580 BC',
    theme: 'Tearful Faithfulness & New Covenant',
    summary:
      'Known as the weeping prophet, Jeremiah faithfully warns Jerusalem of looming Babylonian judgment despite rejection and imprisonment. Amid grief, he delivers God’s breathtaking promise of a New Covenant written directly on human hearts.',
    keyReferences: ['1:5', '17:9', '29:11', '31:33'],
  },
  LAM: {
    section: 'Major Prophets',
    author: 'Traditional: Jeremiah',
    timeframe: 'c. 586 BC',
    theme: 'Grief & Unfailing Mercy',
    summary:
      'Written in the ashes of Jerusalem’s destruction, Lamentations pours out five structured poems of sorrow over sin and national tragedy. Right at the center of the book rises an enduring confession of God’s fresh morning mercies.',
    keyReferences: ['1:12', '3:22-23', '3:25', '5:21'],
  },
  EZK: {
    section: 'Major Prophets',
    author: 'Ezekiel',
    timeframe: 'c. 593–571 BC',
    theme: 'God’s Glory & New Heart',
    summary:
      'Writing among Jewish exiles in Babylon, Ezekiel uses dramatic visions and acted parables to explain why God’s glory departed from a corrupt Temple. He closes with dry bones rising to life, a new spirit within, and God’s presence returning forever.',
    keyReferences: ['11:19', '34:11', '36:26', '37:5'],
  },
  DAN: {
    section: 'Major Prophets',
    author: 'Daniel',
    timeframe: 'c. 605–536 BC',
    theme: 'Faithfulness Under Empires',
    summary:
      'Daniel follows young Hebrew exiles who remain uncompromisingly loyal to God inside Babylon’s courts, fiery furnaces, and lions’ dens. Apocalyptic visions in the second half assure oppressed believers that earthly empires fall while God’s kingdom stands forever.',
    keyReferences: ['3:17-18', '6:22', '7:14', '12:3'],
  },
  HOS: {
    section: 'Minor Prophets',
    author: 'Hosea',
    timeframe: 'c. 755–715 BC',
    theme: 'Relentless Redeeming Love',
    summary:
      'Through Hosea’s painful marriage to an unfaithful wife, God illustrates His heartbroken yet pursuing love for idolatrous Israel. Even as judgment falls, God pleads for genuine knowledge of Him and vows to heal His wandering bride.',
    keyReferences: ['4:6', '6:6', '10:12', '14:4'],
  },
  JOL: {
    section: 'Minor Prophets',
    author: 'Joel',
    timeframe: 'c. 835–500 BC',
    theme: 'Repentance & Outpoured Spirit',
    summary:
      'Using a devastating locust plague as a wake-up call to Judah, Joel summons the nation to tear their hearts rather than their garments. God responds with promises to restore the lost years and pour out His Spirit on all people.',
    keyReferences: ['2:12-13', '2:25', '2:28', '2:32'],
  },
  AMO: {
    section: 'Minor Prophets',
    author: 'Amos',
    timeframe: 'c. 760–750 BC',
    theme: 'Justice & True Worship',
    summary:
      'Called from tending flocks in Judea, Amos confronts the wealthy northern kingdom for crushing the poor while keeping outward religious festivals. He calls for justice to roll like a mighty river and promises eventual restoration for David’s house.',
    keyReferences: ['3:3', '5:14', '5:24', '9:11'],
  },
  OBA: {
    section: 'Minor Prophets',
    author: 'Obadiah',
    timeframe: 'c. 586–580 BC',
    theme: 'Pride Humbled, Kingdom Restored',
    summary:
      'The shortest book of the Old Testament pronounces judgment on Edom for gloating over and exploiting Judah during Jerusalem’s fall. It warns that pride deceives the heart, yet the Lord’s deliverance will ultimately prevail on Mount Zion.',
    keyReferences: ['1:3', '1:15', '1:17', '1:21'],
  },
  JON: {
    section: 'Minor Prophets',
    author: 'Jonah',
    timeframe: 'c. 780–750 BC',
    theme: 'Mercy Beyond Borders',
    summary:
      'Fleeing God’s call to preach to Israel’s ruthless enemy Nineveh, a reluctant prophet is swallowed by a great fish and redirected through prayer. When Nineveh repents, God spares the city, exposing Jonah’s bitterness toward divine compassion.',
    keyReferences: ['2:9', '3:10', '4:2', '4:11'],
  },
  MIC: {
    section: 'Minor Prophets',
    author: 'Micah',
    timeframe: 'c. 740–700 BC',
    theme: 'Justice, Mercy & Humility',
    summary:
      'Micah indicts corrupt leaders and false prophets in Samaria and Jerusalem while foretelling Bethlehem as the birthplace of Israel’s promised Ruler. He distills faithful living into acting justly, loving mercy, and walking humbly with God.',
    keyReferences: ['5:2', '6:8', '7:7', '7:18'],
  },
  NAM: {
    section: 'Minor Prophets',
    author: 'Nahum',
    timeframe: 'c. 663–612 BC',
    theme: 'Comfort & Justice Over Evil',
    summary:
      'A century after Jonah, Nahum announces the irreversible downfall of cruel Nineveh, Assyria’s capital. While declaring God’s wrath against violent oppression, the prophet begins with quiet assurance that the Lord is a refuge for those who trust Him.',
    keyReferences: ['1:3', '1:7', '1:15', '3:19'],
  },
  HAB: {
    section: 'Minor Prophets',
    author: 'Habakkuk',
    timeframe: 'c. 612–605 BC',
    theme: 'Living by Steadfast Faith',
    summary:
      'Habakkuk voices honest perplexity over why God tolerates injustice and plans to use ruthless Babylon for discipline. His dialogue moves from troubled questioning to a triumphant hymn of joy in God even when every harvest fails.',
    keyReferences: ['1:5', '2:4', '2:14', '3:17-18'],
  },
  ZEP: {
    section: 'Minor Prophets',
    author: 'Zephaniah',
    timeframe: 'c. 635–625 BC',
    theme: 'Judgment & Joyful Singing',
    summary:
      'Writing before King Josiah’s reforms, Zephaniah warns Judah and the nations of the approaching Day of the Lord against complacency. Yet past purifying judgment, he paints a tender scene of God rejoicing over His restored remnant with singing.',
    keyReferences: ['1:14', '2:3', '3:9', '3:17'],
  },
  HAG: {
    section: 'Minor Prophets',
    author: 'Haggai',
    timeframe: '520 BC',
    theme: 'First Things First',
    summary:
      'Addressing exiles who had settled into building their own paneled houses while leaving God’s Temple in ruins, Haggai calls the people to reorder their priorities. When they obey in faith, God promises His presence and future glory greater than the first.',
    keyReferences: ['1:5', '1:8', '2:4', '2:9'],
  },
  ZEC: {
    section: 'Minor Prophets',
    author: 'Zechariah',
    timeframe: '520–480 BC',
    theme: 'Renewal by God’s Spirit',
    summary:
      'Through eight vivid night visions and messianic prophecies, Zechariah encourages the discouraged rebuilders of Jerusalem. He reveals a humble King arriving on a donkey and a fountain opened to cleanse sin, declaring victory not by might, but by God’s Spirit.',
    keyReferences: ['4:6', '8:16', '9:9', '14:9'],
  },
  MAL: {
    section: 'Minor Prophets',
    author: 'Malachi',
    timeframe: 'c. 430 BC',
    theme: 'Wholehearted Reverence',
    summary:
      'Closing the Old Testament, Malachi confronts priests and people offering half-hearted worship, broken vows, and withheld tithes. He affirms God’s unchanging love and foretells a messenger preparing the way before the Sun of Righteousness rises.',
    keyReferences: ['3:1', '3:6', '3:10', '4:2'],
  },
  MAT: {
    section: 'Gospels & Acts',
    author: 'Matthew',
    timeframe: 'c. AD 55–68',
    theme: 'Jesus, Promised King & Teacher',
    summary:
      'Matthew presents Jesus Christ as the royal Son of David and Son of Abraham who fulfills the Law and Prophets. Framing five major teaching blocks including the Sermon on the Mount, he concludes with the Great Commission to make disciples of all nations.',
    keyReferences: ['5:3-6', '6:33', '11:28', '28:19-20'],
  },
  MRK: {
    section: 'Gospels & Acts',
    author: 'John Mark',
    timeframe: 'c. AD 55–65',
    theme: 'The Servant King in Action',
    summary:
      'Fast-paced and vivid, Mark highlights Jesus’ authority over disease, storms, demons, and sin while continually moving toward the cross. At its hinge, Jesus declares that true greatness lies in servant sacrifice and giving His life as a ransom for many.',
    keyReferences: ['1:15', '8:34', '10:45', '15:39'],
  },
  LUK: {
    section: 'Gospels & Acts',
    author: 'Luke',
    timeframe: 'c. AD 60–62',
    theme: 'Compassion for Every Outsider',
    summary:
      'Investigated carefully by a physician and historian, Luke’s Gospel portrays Jesus as the Savior who seeks the lost, lifts the lowly, and welcomes women, Samaritans, and sinners. Parables like the Good Samaritan and Prodigal Son showcase the Father’s joyous grace.',
    keyReferences: ['2:10-11', '9:23', '15:20', '19:10'],
  },
  JHN: {
    section: 'Gospels & Acts',
    author: 'John',
    timeframe: 'c. AD 85–95',
    theme: 'Believe & Have Eternal Life',
    summary:
      'John selects seven miraculous signs and seven "I Am" declarations to reveal Jesus as the eternal Word made flesh. Through intimate conversations with Nicodemus, the Samaritan woman, and His disciples, he invites readers to believe and experience abundant life.',
    keyReferences: ['1:14', '3:16', '14:6', '20:31'],
  },
  ACT: {
    section: 'Gospels & Acts',
    author: 'Luke',
    timeframe: 'c. AD 62–64',
    theme: 'Spirit-Empowered Witness',
    summary:
      'Acts picks up after Jesus’ ascension as the Holy Spirit descends at Pentecost and propels the gospel from Jerusalem across Judea, Samaria, and Rome. Through Peter, Stephen, and Paul, ordinary believers endure persecution as the young church crosses every cultural barrier.',
    keyReferences: ['1:8', '2:38', '4:12', '16:31'],
  },
  ROM: {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 57',
    theme: 'Righteousness by Faith',
    summary:
      'Paul’s clearest theological letter explains how every person stands guilty before God yet is freely justified through faith in Jesus Christ. Walking through life in the Spirit and God’s plan for Israel, it culminates in offering our daily lives as living sacrifices.',
    keyReferences: ['1:16', '5:8', '8:28', '12:1-2'],
  },
  '1CO': {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 55',
    theme: 'Unity, Love & Cross-Shaped Life',
    summary:
      'Writing to a gifted yet divided church in Corinth, Paul addresses rivalries, immorality, lawsuits, spiritual gifts, and worship disorder through the lens of the cross. At its heart stands chapter 13 on love and chapter 15 on Christ’s bodily resurrection.',
    keyReferences: ['1:18', '10:13', '13:4-7', '15:58'],
  },
  '2CO': {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 55–56',
    theme: 'Strength in Weakness',
    summary:
      'In his most personal letter, Paul defends his apostolic ministry against boastful critics by pointing to his scars, tears, and perseverance. Rather than masking frailty, he reveals that God’s treasure shines brightest through cracked earthen jars.',
    keyReferences: ['4:7', '5:17', '9:7', '12:9'],
  },
  GAL: {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 48–55',
    theme: 'Freedom in Christ Alone',
    summary:
      'Paul writes urgently to Galatian churches tempted to add Mosaic rules to the gospel of grace. Declaring believers crucified with Christ and adopted as heirs, he contrasts dead legalism with a Spirit-led life bearing love, joy, and peace.',
    keyReferences: ['2:20', '3:28', '5:1', '5:22-23'],
  },
  EPH: {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 60–62',
    theme: 'Christ’s Reconciled Church',
    summary:
      'From prison, Paul celebrates the cosmic scope of God’s grace uniting Jew and Gentile into one living temple in Christ. Moving from heavenly identity to earthly households, he calls believers to put on the full armor of God and walk in love.',
    keyReferences: ['2:8-9', '3:20', '4:32', '6:10-11'],
  },
  PHP: {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 61–62',
    theme: 'Unshakeable Joy in Christ',
    summary:
      'Though chained under Roman guard, Paul overflows with gratitude and joy as he writes to his supportive friends in Philippi. Pointing to Christ’s humble self-emptying, he urges believers to trade anxiety for prayerful peace and press toward the prize.',
    keyReferences: ['1:21', '2:5-8', '4:6-7', '4:13'],
  },
  COL: {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 60–62',
    theme: 'Supremacy of Christ',
    summary:
      'To guard the Colossians from hollow philosophies and rule-based mysticism, Paul exalts Jesus as the visible image of the invisible God and Creator of all things. Because the fullness of God dwells in Christ, believers are already complete in Him.',
    keyReferences: ['1:15-16', '2:9-10', '3:1-2', '3:23'],
  },
  '1TH': {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 51',
    theme: 'Hope & Readiness at Christ’s Return',
    summary:
      'Commending a young Macedonian church standing firm under persecution, Paul encourages them in holiness, quiet diligence, and brotherly love. He comforts grieving believers with the sure hope that Christ will return and gather His people forever.',
    keyReferences: ['4:13-14', '5:16-18', '5:23-24'],
  },
  '2TH': {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 51–52',
    theme: 'Steadfastness & Diligence',
    summary:
      'Clearing up confusion that the Day of the Lord had already arrived, Paul outlines the events preceding Christ’s return and comforts suffering saints. He instructs idle members to return to steady, honorable work while waiting in active hope.',
    keyReferences: ['1:11', '2:16-17', '3:3', '3:13'],
  },
  '1TI': {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 62–64',
    theme: 'Healthy Doctrine & Leadership',
    summary:
      'Paul equips his younger coworker Timothy to pastor the church in Ephesus amid false teachers and disputes. The letter gives practical guidance on public prayer, elder and deacon character, and living as a faithful example in speech and purity.',
    keyReferences: ['1:15', '2:5', '4:12', '6:6'],
  },
  '2TI': {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 66–67',
    theme: 'Finish the Race Faithfully',
    summary:
      'Written as Paul’s final letter from a cold Roman dungeon before martyrdom, Second Timothy reads like a passing of the torch. He charges Timothy to fan God’s gift into flame, guard Scripture as God-breathed truth, and endure hardship as a good soldier.',
    keyReferences: ['1:7', '2:15', '3:16', '4:7'],
  },
  TIT: {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 63–65',
    theme: 'Grace That Trains Good Works',
    summary:
      'Left on the island of Crete to organize fledgling churches, Titus receives clear qualifications for elders and counsel for every age group. Paul emphasizes that God’s saving grace trains believers to live self-controlled, upright, and generous lives.',
    keyReferences: ['1:9', '2:11-12', '3:5'],
  },
  PHM: {
    section: 'Pauline Epistles',
    author: 'Paul',
    timeframe: 'c. AD 60–62',
    theme: 'Reconciliation in Brotherhood',
    summary:
      'In a warm, persuasive personal note, Paul appeals to slave-owner Philemon on behalf of Onesimus, a runaway servant who came to faith in Rome. Rather than commanding obedience, Paul asks Philemon to welcome Onesimus back as a beloved brother in Christ.',
    keyReferences: ['1:6', '1:15-16', '1:21'],
  },
  HEB: {
    section: 'General Epistles',
    author: 'Unknown',
    timeframe: 'c. AD 64–69',
    theme: 'Jesus, Better Sacrifice & High Priest',
    summary:
      'Addressing weary Jewish believers tempted to drift back to Old Covenant shadows, Hebrews shows how Jesus surpasses angels, Moses, and Levitical priests. Anchored by a hall of faith in chapter 11, it urges readers to fix their eyes on Jesus and run with endurance.',
    keyReferences: ['4:12', '4:16', '11:1', '12:1-2'],
  },
  JAS: {
    section: 'General Epistles',
    author: 'James (brother of Jesus)',
    timeframe: 'c. AD 45–49',
    theme: 'Living Faith in Action',
    summary:
      'Rich with wisdom reminiscent of Proverbs and the Sermon on the Mount, James challenges scattered believers not merely to hear the Word, but to live it out. Authentic faith perseveres in trials, tames the tongue, cares for the vulnerable, and refuses partiality.',
    keyReferences: ['1:2-3', '1:22', '2:17', '4:8'],
  },
  '1PE': {
    section: 'General Epistles',
    author: 'Peter',
    timeframe: 'c. AD 62–64',
    theme: 'Living Hope Amid Suffering',
    summary:
      'Writing to Christians facing slander and persecution across Asia Minor, Peter anchors their identity as a royal priesthood born into a living hope. Following Christ’s humble example, believers honor God through patient endurance and love.',
    keyReferences: ['1:3', '2:9', '3:15', '5:7'],
  },
  '2PE': {
    section: 'General Epistles',
    author: 'Peter',
    timeframe: 'c. AD 65–68',
    theme: 'Grow in Truth Before His Return',
    summary:
      'Sensing his approaching death, Peter urges believers to add virtue, knowledge, and love onto their faith while warning sharply against greedy false teachers. He reminds scoffers that God’s seeming delay is patience desiring everyone to reach repentance.',
    keyReferences: ['1:3', '1:21', '3:9', '3:18'],
  },
  '1JN': {
    section: 'General Epistles',
    author: 'John',
    timeframe: 'c. AD 85–95',
    theme: 'Light, Love & Assurance',
    summary:
      'Countering early teachers who denied Christ’s true humanity or minimized sin, John tests genuine fellowship through truth, obedience, and sacrificial love. He reassures believers that they can know with quiet confidence that they possess eternal life.',
    keyReferences: ['1:9', '3:1', '4:7-8', '5:13'],
  },
  '2JN': {
    section: 'General Epistles',
    author: 'John',
    timeframe: 'c. AD 85–95',
    theme: 'Walk in Truth & Love',
    summary:
      'In a brief letter to a local congregation, John rejoices to see believers walking faithfully in truth and loving one another. At the same time, he urges discernment so hospitality never empowers deceptive teachers denying Jesus Christ.',
    keyReferences: ['1:4', '1:6', '1:8'],
  },
  '3JN': {
    section: 'General Epistles',
    author: 'John',
    timeframe: 'c. AD 85–95',
    theme: 'Generous Hospitality in Truth',
    summary:
      'Writing to his faithful friend Gaius, John praises his warm hospitality toward traveling gospel workers in sharp contrast to power-hungry Diotrephes. The short note celebrates everyday generosity as fellow-workmanship with the truth.',
    keyReferences: ['1:2', '1:4', '1:11'],
  },
  JUD: {
    section: 'General Epistles',
    author: 'Jude (brother of Jesus)',
    timeframe: 'c. AD 65–80',
    theme: 'Contend for the Faith',
    summary:
      'Though hoping to write cheerfully about shared salvation, Jude shifts abruptly to urge Christians to contend earnestly for the apostolic faith against corrupt intruders. He closes with one of Scripture’s most beloved doxologies to the God able to keep us from stumbling.',
    keyReferences: ['1:3', '1:20-21', '1:24-25'],
  },
  REV: {
    section: 'Prophecy & Revelation',
    author: 'John',
    timeframe: 'c. AD 95',
    theme: 'The Lamb’s Eternal Victory',
    summary:
      'From exile on Patmos, John unveils Christ’s messages to seven churches and breathtaking heavenly visions of the slain Lamb opening history’s scroll. Even through cosmic tribulation, the story ends in a renewed heaven and earth where God wipes away every tear.',
    keyReferences: ['1:8', '3:20', '21:4', '22:20'],
  },
};

export function getBookOverview(bookId: string): BookOverview {
  return BOOK_OVERVIEWS[bookId] ?? BOOK_OVERVIEWS.GEN;
}

export function parseBookKeyReference(refStr: string): { chapter: number; verse: number } {
  const match = refStr.trim().match(/^(\d+)\s*:\s*(\d+)/);
  if (!match) {
    const singleChapterVerse = Number(refStr.trim());
    return {
      chapter: 1,
      verse: Number.isFinite(singleChapterVerse) && singleChapterVerse > 0 ? singleChapterVerse : 1,
    };
  }
  const chapter = Math.max(1, Number(match[1]) || 1);
  const verse = Math.max(1, Number(match[2]) || 1);
  return { chapter, verse };
}
