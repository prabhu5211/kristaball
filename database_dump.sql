--
-- PostgreSQL database dump
--

\restrict rp6QGW2V2lOsmqUih6AMwd8FCcfRQRHfdjJLOvcBHQOkfO2ltp77f1OelDXaigF

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignments (
    id integer NOT NULL,
    base_id integer NOT NULL,
    equipment_type_id integer NOT NULL,
    quantity integer NOT NULL,
    assigned_to character varying(150) NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT assignments_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.assignments OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.assignments_id_seq OWNER TO postgres;

--
-- Name: assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.assignments_id_seq OWNED BY public.assignments.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(50) NOT NULL,
    entity_id integer,
    details text NOT NULL,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_logs_action_check CHECK (((action)::text = ANY ((ARRAY['PURCHASE'::character varying, 'TRANSFER'::character varying, 'ASSIGNMENT'::character varying, 'EXPENDITURE'::character varying, 'LOGIN'::character varying, 'USER_CREATED'::character varying])::text[])))
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_id_seq OWNER TO postgres;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: bases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bases (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    location character varying(150) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bases OWNER TO postgres;

--
-- Name: bases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bases_id_seq OWNER TO postgres;

--
-- Name: bases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bases_id_seq OWNED BY public.bases.id;


--
-- Name: equipment_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.equipment_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    unit character varying(30) DEFAULT 'unit'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT equipment_types_category_check CHECK (((category)::text = ANY ((ARRAY['WEAPON'::character varying, 'VEHICLE'::character varying, 'AMMUNITION'::character varying])::text[])))
);


ALTER TABLE public.equipment_types OWNER TO postgres;

--
-- Name: equipment_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.equipment_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.equipment_types_id_seq OWNER TO postgres;

--
-- Name: equipment_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.equipment_types_id_seq OWNED BY public.equipment_types.id;


--
-- Name: expenditures; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenditures (
    id integer NOT NULL,
    base_id integer NOT NULL,
    equipment_type_id integer NOT NULL,
    quantity integer NOT NULL,
    reason character varying(255),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT expenditures_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.expenditures OWNER TO postgres;

--
-- Name: expenditures_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenditures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenditures_id_seq OWNER TO postgres;

--
-- Name: expenditures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenditures_id_seq OWNED BY public.expenditures.id;


--
-- Name: purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.purchases (
    id integer NOT NULL,
    base_id integer NOT NULL,
    equipment_type_id integer NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(12,2) DEFAULT 0,
    supplier character varying(150),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchases_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.purchases OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.purchases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.purchases_id_seq OWNER TO postgres;

--
-- Name: purchases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.purchases_id_seq OWNED BY public.purchases.id;


--
-- Name: transfers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transfers (
    id integer NOT NULL,
    source_base_id integer NOT NULL,
    destination_base_id integer NOT NULL,
    equipment_type_id integer NOT NULL,
    quantity integer NOT NULL,
    status character varying(20) DEFAULT 'COMPLETED'::character varying NOT NULL,
    notes text,
    initiated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transfers_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT transfers_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_TRANSIT'::character varying, 'COMPLETED'::character varying, 'CANCELLED'::character varying])::text[])))
);


ALTER TABLE public.transfers OWNER TO postgres;

--
-- Name: transfers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transfers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transfers_id_seq OWNER TO postgres;

--
-- Name: transfers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transfers_id_seq OWNED BY public.transfers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(30) NOT NULL,
    base_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['ADMIN'::character varying, 'BASE_COMMANDER'::character varying, 'LOGISTICS_OFFICER'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments ALTER COLUMN id SET DEFAULT nextval('public.assignments_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: bases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bases ALTER COLUMN id SET DEFAULT nextval('public.bases_id_seq'::regclass);


--
-- Name: equipment_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_types ALTER COLUMN id SET DEFAULT nextval('public.equipment_types_id_seq'::regclass);


--
-- Name: expenditures id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenditures ALTER COLUMN id SET DEFAULT nextval('public.expenditures_id_seq'::regclass);


--
-- Name: purchases id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases ALTER COLUMN id SET DEFAULT nextval('public.purchases_id_seq'::regclass);


--
-- Name: transfers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers ALTER COLUMN id SET DEFAULT nextval('public.transfers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignments (id, base_id, equipment_type_id, quantity, assigned_to, notes, created_by, created_at) FROM stdin;
1	1	1	20	1st Infantry Platoon	\N	1	2026-08-12 21:16:54.544586
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.audit_logs (id, user_id, action, entity_id, details, ip_address, created_at) FROM stdin;
1	1	LOGIN	\N	Initial admin seed login	\N	2026-08-12 21:16:54.55154
2	1	LOGIN	\N	User "admin_user" logged in successfully.	::1	2026-08-12 21:21:13.568938
3	2	LOGIN	\N	User "commander_alpha" logged in successfully.	::1	2026-08-12 21:22:10.970904
4	3	LOGIN	\N	User "logistics_officer" logged in successfully.	::1	2026-08-12 21:22:27.239107
5	1	LOGIN	\N	User "admin_user" logged in successfully.	::1	2026-08-12 21:25:02.514275
6	1	PURCHASE	9	Purchase: 68 units of equipment_type #4 at Base #1 from "Kiran".	::1	2026-08-12 21:25:33.607172
7	2	LOGIN	\N	User "commander_alpha" logged in successfully.	::1	2026-08-12 21:25:46.291174
8	2	PURCHASE	10	Purchase: 68 units of equipment_type #4 at Base #1 from "kiran".	::1	2026-08-12 21:27:13.746844
9	3	LOGIN	\N	User "logistics_officer" logged in successfully.	::1	2026-08-12 21:27:26.007147
10	1	LOGIN	\N	User "admin_user" logged in successfully.	::1	2026-08-12 21:28:24.183361
\.


--
-- Data for Name: bases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bases (id, name, location, created_at) FROM stdin;
1	Fort Alpha	Northern Region	2026-08-12 21:14:48.055452
2	Fort Bravo	Eastern Region	2026-08-12 21:14:48.055452
3	Fort Charlie	Southern Region	2026-08-12 21:14:48.055452
\.


--
-- Data for Name: equipment_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.equipment_types (id, name, category, unit, created_at) FROM stdin;
1	M4 Carbine	WEAPON	unit	2026-08-12 21:14:48.058321
2	M9 Pistol	WEAPON	unit	2026-08-12 21:14:48.058321
3	M249 SAW	WEAPON	unit	2026-08-12 21:14:48.058321
4	Humvee	VEHICLE	unit	2026-08-12 21:14:48.058321
5	MRAP	VEHICLE	unit	2026-08-12 21:14:48.058321
6	5.56mm Ammo	AMMUNITION	rounds	2026-08-12 21:14:48.058321
7	9mm Ammo	AMMUNITION	rounds	2026-08-12 21:14:48.058321
8	40mm Grenade	AMMUNITION	rounds	2026-08-12 21:14:48.058321
\.


--
-- Data for Name: expenditures; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenditures (id, base_id, equipment_type_id, quantity, reason, notes, created_by, created_at) FROM stdin;
1	1	6	500	Live-fire training exercise	\N	1	2026-08-12 21:16:54.548425
\.


--
-- Data for Name: purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.purchases (id, base_id, equipment_type_id, quantity, unit_cost, supplier, notes, created_by, created_at) FROM stdin;
1	1	1	50	0.00	\N	\N	1	2026-08-12 21:16:54.522326
2	1	6	5000	0.00	\N	\N	1	2026-08-12 21:16:54.527448
3	1	4	5	0.00	\N	\N	1	2026-08-12 21:16:54.52894
4	2	2	30	0.00	\N	\N	1	2026-08-12 21:16:54.53112
5	2	7	3000	0.00	\N	\N	1	2026-08-12 21:16:54.532911
6	2	5	3	0.00	\N	\N	1	2026-08-12 21:16:54.534511
7	3	3	10	0.00	\N	\N	1	2026-08-12 21:16:54.536501
8	3	8	200	0.00	\N	\N	1	2026-08-12 21:16:54.538511
9	1	4	68	90.00	Kiran	\N	1	2026-08-12 21:25:33.59779
10	1	4	68	90.00	kiran	\N	2	2026-08-12 21:27:13.737782
\.


--
-- Data for Name: transfers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transfers (id, source_base_id, destination_base_id, equipment_type_id, quantity, status, notes, initiated_by, created_at) FROM stdin;
1	1	2	1	10	COMPLETED	Reallocation for training exercise	1	2026-08-12 21:16:54.539825
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, password_hash, role, base_id, created_at) FROM stdin;
1	admin_user	$2b$12$UIQfYhS2yoXBJKvj0SC4Z.yqw.8XyZr05C.WPX2E0JyEhQd4XR11C	ADMIN	\N	2026-08-12 21:16:54.513967
2	commander_alpha	$2b$12$9gPLfg1GwtuU7RWbrf.1M.lpwDT0irhRJk4gEIwhTmKDKPijfs99W	BASE_COMMANDER	1	2026-08-12 21:16:54.513967
3	logistics_officer	$2b$12$iMCr9gUdDJ0O4hzfWdZBFubHJ2vVlYH82Cvx/6U2e4yIdnO8M8lH.	LOGISTICS_OFFICER	1	2026-08-12 21:16:54.513967
\.


--
-- Name: assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.assignments_id_seq', 1, true);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 10, true);


--
-- Name: bases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bases_id_seq', 3, true);


--
-- Name: equipment_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.equipment_types_id_seq', 8, true);


--
-- Name: expenditures_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.expenditures_id_seq', 1, true);


--
-- Name: purchases_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.purchases_id_seq', 10, true);


--
-- Name: transfers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transfers_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bases bases_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bases
    ADD CONSTRAINT bases_name_key UNIQUE (name);


--
-- Name: bases bases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bases
    ADD CONSTRAINT bases_pkey PRIMARY KEY (id);


--
-- Name: equipment_types equipment_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_types
    ADD CONSTRAINT equipment_types_name_key UNIQUE (name);


--
-- Name: equipment_types equipment_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.equipment_types
    ADD CONSTRAINT equipment_types_pkey PRIMARY KEY (id);


--
-- Name: expenditures expenditures_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenditures
    ADD CONSTRAINT expenditures_pkey PRIMARY KEY (id);


--
-- Name: purchases purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_pkey PRIMARY KEY (id);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_assignments_base; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_base ON public.assignments USING btree (base_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user ON public.audit_logs USING btree (user_id);


--
-- Name: idx_expenditures_base; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenditures_base ON public.expenditures USING btree (base_id);


--
-- Name: idx_purchases_base; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchases_base ON public.purchases USING btree (base_id);


--
-- Name: idx_purchases_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchases_created_at ON public.purchases USING btree (created_at);


--
-- Name: idx_purchases_equipment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_purchases_equipment ON public.purchases USING btree (equipment_type_id);


--
-- Name: idx_transfers_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfers_created_at ON public.transfers USING btree (created_at);


--
-- Name: idx_transfers_destination; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfers_destination ON public.transfers USING btree (destination_base_id);


--
-- Name: idx_transfers_equipment; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfers_equipment ON public.transfers USING btree (equipment_type_id);


--
-- Name: idx_transfers_source; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transfers_source ON public.transfers USING btree (source_base_id);


--
-- Name: assignments assignments_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE CASCADE;


--
-- Name: assignments assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: assignments assignments_equipment_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_equipment_type_id_fkey FOREIGN KEY (equipment_type_id) REFERENCES public.equipment_types(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expenditures expenditures_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenditures
    ADD CONSTRAINT expenditures_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE CASCADE;


--
-- Name: expenditures expenditures_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenditures
    ADD CONSTRAINT expenditures_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: expenditures expenditures_equipment_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenditures
    ADD CONSTRAINT expenditures_equipment_type_id_fkey FOREIGN KEY (equipment_type_id) REFERENCES public.equipment_types(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE CASCADE;


--
-- Name: purchases purchases_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: purchases purchases_equipment_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.purchases
    ADD CONSTRAINT purchases_equipment_type_id_fkey FOREIGN KEY (equipment_type_id) REFERENCES public.equipment_types(id) ON DELETE CASCADE;


--
-- Name: transfers transfers_destination_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_destination_base_id_fkey FOREIGN KEY (destination_base_id) REFERENCES public.bases(id) ON DELETE CASCADE;


--
-- Name: transfers transfers_equipment_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_equipment_type_id_fkey FOREIGN KEY (equipment_type_id) REFERENCES public.equipment_types(id) ON DELETE CASCADE;


--
-- Name: transfers transfers_initiated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_initiated_by_fkey FOREIGN KEY (initiated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: transfers transfers_source_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_source_base_id_fkey FOREIGN KEY (source_base_id) REFERENCES public.bases(id) ON DELETE CASCADE;


--
-- Name: users users_base_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_base_id_fkey FOREIGN KEY (base_id) REFERENCES public.bases(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict rp6QGW2V2lOsmqUih6AMwd8FCcfRQRHfdjJLOvcBHQOkfO2ltp77f1OelDXaigF

