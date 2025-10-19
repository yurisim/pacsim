```mermaid  
---
config:
  layout: dagre
  look: neo
---
flowchart TB
 subgraph Version["Version 30.SEP.25"]
    direction LR
        V[" "]
  end
 subgraph Timeline["Timeline"]
    direction LR
        T0_Review["00:00<br><b>Review All Documents</b><br>CFACC [cite: 5.1.1]<br>MOB [cite: 5.2.1]<br>CSpOC [cite: 5.3.1]"]
        T1["00:00<br><b>Start<br>Turn 1 Planning</b><br>45 min Planning<br>15 min Pre-brief<br>[cite: 5.1.8.1]"]
        T2["00:45<br><b>CSpOC Pre-brief<br>Complete</b><br>CSpOC starts Looks<br>[cite: 5.3.8.1]"]
        T3_Exec["01:00<br><b>All Teams Report<br>to CAOC for<br>Turn 1 Execution</b><br>[cite: 5.1.8.2, 5.1.8.2.1]"]
        T4["01:25<br><b>Turn 2<br>Planning Starts</b><br>40 min<br>[cite: 5.1.8.3]"]
        T5["02:05<br><b>Turn 2<br>Execution Starts</b><br>25 min<br>[cite: 5.1.8.4]"]
        T6["02:30<br><b>Hotwash/Debrief<br>Starts</b><br>30 min total<br>[cite: 5.1.8.5]"]
        T7["03:00<br><b>End</b>"]
  end
 subgraph CFACC["CFACC/CAOC Swimlane"]
    direction LR
        C2["View Political Assessment<br>[cite: 5.1.2]"]
        C3["Analyze AEW/CC Requests &amp;<br>Prioritize Airlift<br>[cite: 5.1.3]"]
        C4["Allocate Aircraft to MOBs<br>Give Physical Tubes<br>[cite: 5.1.3]"]
        C5["USTRANSCOM:<br>Designate Personnel<br>Load Out Aircraft<br>[cite: 5.1.5]"]
        C5b["Distribute Sealift<br>Requests<br>[cite: 5.1.6]"]
        C7["Verify ATO Lines:<br>Flight Plans, Workload,<br>MOG &amp; Issue PPRs<br>[cite: 5.1.4]"]
        C6["Mission Pre-brief<br>15 min<br>[cite: 5.1.8.1, 5.1.8.1.1]"]
        C8["Turn 1 Execution<br>Receive MOB Reports<br>25 min<br>[cite: 5.1.8.2, 5.1.8.2.1]"]
        C9["Plan Turn 2<br>40 min<br>[cite: 5.1.8.3]"]
        C10["Execute Turn 2<br>25 min<br>[cite: 5.1.8.4]"]
        C11["Hotwash 10 min<br>Debrief to Instructor 10 min<br>Instructor Feedback 10 min<br>[cite: 5.1.8.5]"]
  end
 subgraph MOB["MOB Swimlane"]
    direction LR
        M2["View Political Assessment<br>[cite: 5.2.2]"]
        M3["Select FOS Locations<br>Consider Abandoning/New<br>Max 4 Operational<br>[cite: 5.2.3]"]
        M4["Request RFIs<br>Initial 5 per FOS<br>[cite: 5.2.4]"]
        M5["Determine Airfield<br>Requirements &amp;<br>Resources Needed<br>[cite: 5.2.5]"]
        M6["Request Aircraft<br>from CFACC<br>[cite: 5.2.6]"]
        M7["Develop Load Plans<br>Load Cargo into Tubes<br>[cite: 5.2.7]"]
        M8["Complete ATO:<br>Flight Plans, Destinations,<br>Risk Cards<br>[cite: 5.2.8]"]
        M9["Plan Fighter Sorties<br>Single or Two-Ship<br>[cite: 5.2.9]"]
        M10["Mission Pre-brief<br>15 min<br>[cite: 5.2.11.1, 5.2.11.1.1]"]
        M11["Turn 1 Execution:<br>Report with Loaded Aircraft,<br>Fighters, Risk Tokens<br>25 min<br>[cite: 5.2.11.2]"]
        M12["Plan Turn 2<br>40 min<br>[cite: 5.2.11.3]"]
        M13["Execute Turn 2<br>25 min<br>[cite: 5.2.11.4]"]
        M14["Hotwash 10 min<br>Debrief to Instructor 10 min<br>Instructor Feedback 10 min<br>[cite: 5.2.11.5]"]
  end
 subgraph MEDCOM["MEDCOM Swimlane"]
    direction LR
        MC1["Identify Hospital<br>Setup Requirements<br>[cite: 9.3.1]"]
        MC2["Request Aircraft<br>from CFACC<br>[cite: 9.3.4]"]
        MC3["Develop Load Plans<br>(Cargo or MEDEVAC)<br>[cite: 9.3.4]"]
        MC4["Complete MEDCOM ATO<br>[cite: 9.3.5]"]
        MC5["Coordinate with<br>MOBs/FOSs<br>[cite: 9.3.7]"]
        MC6["Mission Pre-brief<br>15 min"]
        MC7["Turn 1 Execution:<br>Declare MEDEVAC &amp;<br>Provide Tokens<br>25 min<br>[cite: 9.3.6]"]
        MC8["Plan Turn 2<br>40 min"]
        MC9["Execute Turn 2<br>25 min"]
        MC10["Hotwash 10 min<br>Debrief to Instructor 10 min<br>Instructor Feedback 10 min"]
  end
 subgraph CSpOC["CSpOC Swimlane"]
    direction LR
        S2["Coordinate with CFACC<br>for Collection Priorities<br>Assign LNOs to<br>CAOC and MOBs<br>[cite: 5.3.2]"]
        S3["Place Initial 14 Satellites<br>+ 1 Cyber Package<br>[cite: 5.3.3]"]
        S4["Develop Tracking:<br>Passes, Types,<br>Locations, Orbits<br>[cite: 5.3.5]"]
        S5["Plan Offensive<br>Maneuvers/Attacks<br>Orbital Warfare<br>[cite: 5.3.6]"]
        S6["Mission Pre-brief<br>30 min Planning<br>15 min Pre-brief<br>[cite: 5.3.8.1]"]
        S7["Look 1 (00:45-01:00)<br>Look 2 (01:00-01:15)<br><b>Intel Feed to Teams</b><br>[cite: 5.3.8.2]"]
        S8["Look 3 (01:15-01:30)<br>Look 4 (01:30-01:45)<br>Look 5 (01:45-02:00)<br>Look 6 (02:00-02:15)<br>Look 7 (02:15-02:30)<br>[cite: 5.3.8.2]"]
        S9["Note: Pull Event Card<br>at Start of Each Turn<br>Move Satellites Forward<br>Then Conduct Looks<br>[cite: 5.3.7]"]
        S10["Hotwash 10 min<br>Debrief to Instructor 10 min<br>Instructor Feedback 10 min<br>[cite: 5.3.8.3]"]
  end
 subgraph Support["Game Management"]
    direction LR
        G2["GM Provides<br>RFI Results<br>[cite: 5.2.4]"]
  end
    T0_Review --> T1
    T1 L_T1_C2_0@-.-> C2 & M2
    T1 L_T1_S2_0@--> S2
    C2 --> C3
    C3 --> C4
    C4 --> C5
    C5 --> C5b
    C5b --> C7
    C7 --> C6
    S2 --> S3
    S3 --> S4
    S4 --> S5
    S5 --> S6
    S6 --> T2
    T2 L_T2_S7_0@--> S7
    M2 --> M3
    M3 --> M4
    M4 --> G2
    G2 --> M5
    M5 --> M6
    M6 --> M7
    M7 --> M8
    M8 --> M9
    M9 --> M10
    M6 -. Request .-> C3
    S2 <-. Coordinate .-> C3
    S7 -. Intel .-> C6 & M10
    C6 --> T3_Exec
    M10 --> T3_Exec
    T3_Exec L_T3_Exec_C8_0@--> C8 & M11
    C8 --> T4
    M11 --> T4
    S7 --> S8
    S8 -. Intel .-> T4
    T4 L_T4_C9_0@--> C9 & M12
    C9 --> T5
    M12 --> T5
    T5 L_T5_C10_0@--> C10 & M13
    S8 --> T6
    C10 --> T6
    M13 --> T6
    T6 L_T6_C11_0@--> C11 & M14 & S10
    C11 --> T7
    M14 --> T7
    S10 --> T7
     T0_Review:::timeBox
     T1:::timeBox
     T2:::timeBox
     T3_Exec:::timeBox
     T4:::timeBox
     T5:::timeBox
     T6:::timeBox
     T7:::timeBox
     C2:::cfaccBox
     C3:::cfaccBox
     C4:::cfaccBox
     C5:::cfaccBox
     C5b:::cfaccBox
     C7:::cfaccBox
     C6:::cfaccBox
     C8:::cfaccBox
     C9:::cfaccBox
     C10:::cfaccBox
     C11:::cfaccBox
     M2:::mobBox
     M3:::mobBox
     M4:::mobBox
     M5:::mobBox
     M6:::mobBox
     M7:::mobBox
     M8:::mobBox
     M9:::mobBox
     M10:::mobBox
     M11:::mobBox
     M12:::mobBox
     M13:::mobBox
     M14:::mobBox
     MC1:::medcomBox
     MC2:::medcomBox
     MC3:::medcomBox
     MC4:::medcomBox
     MC5:::medcomBox
     MC6:::medcomBox
     MC7:::medcomBox
     MC8:::medcomBox
     MC9:::medcomBox
     MC10:::medcomBox
     S2:::cspocBox
     S3:::cspocBox
     S4:::cspocBox
     S5:::cspocBox
     S6:::cspocBox
     S7:::cspocBox
     S8:::cspocBox
     S9:::cspocBox
     S10:::cspocBox
     G2:::supportBox
    classDef cfaccBox fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef mobBox fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef cspocBox fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef medcomBox fill:#e3f2fd,stroke:#0d47a1,stroke-width:2px
    classDef supportBox fill:#f5f5f5,stroke:#424242,stroke-width:2px
    classDef timeBox fill:#fff9c4,stroke:#f57f17,stroke-width:3px,font-weight:bold
    L_T1_C2_0@{ animation: slow } 
    L_T1_MC1_0@{ animation: slow } 
    L_T1_S2_0@{ animation: slow } 
    L_T2_S7_0@{ animation: slow } 
    L_T3_Exec_C8_0@{ animation: slow } 
    L_T4_C9_0@{ animation: slow } 
    L_T5_C10_0@{ animation: slow } 
    L_T6_C11_0@{ animation: slow }
