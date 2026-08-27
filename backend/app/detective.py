import os
from typing import TypedDict


class GraphNode(TypedDict):
    id: str
    label: str
    kind: str
    status: str


class GraphEdge(TypedDict):
    source: str
    target: str
    relationship: str


def demo_network(agent_id: str) -> dict:
    nodes: list[GraphNode] = [
        {"id": agent_id, "label": agent_id, "kind": "agent", "status": "investigating"},
        {"id": "DEV-77A", "label": "Device 77A", "kind": "device", "status": "linked"},
        {"id": "AGT-9912", "label": "Agent 9912", "kind": "agent", "status": "blocked"},
        {"id": "IP-185.22", "label": "185.22.x.x", "kind": "ip", "status": "observed"},
        {"id": "PAY-TKN-31", "label": "Token ...31", "kind": "payment", "status": "chargeback"},
    ]
    edges: list[GraphEdge] = [
        {"source": agent_id, "target": "DEV-77A", "relationship": "USED_DEVICE"},
        {"source": "AGT-9912", "target": "DEV-77A", "relationship": "USED_DEVICE"},
        {"source": agent_id, "target": "IP-185.22", "relationship": "CONNECTED_FROM"},
        {"source": "AGT-9912", "target": "PAY-TKN-31", "relationship": "USED_PAYMENT"},
    ]
    return {
        "provider": "offline_demo",
        "data_disclosure": "Synthetic relationship data for demonstration only.",
        "nodes": nodes,
        "edges": edges,
    }


def _neo4j_network(agent_id: str) -> dict | None:
    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")
    if not all((uri, username, password)):
        return None

    try:
        from neo4j import GraphDatabase

        query = """
        MATCH path=(agent:Agent {id: $agent_id})-[*0..2]-(connected)
        UNWIND nodes(path) AS entity
        WITH collect(DISTINCT entity) AS entities
        OPTIONAL MATCH (left)-[relationship]-(right)
        WHERE left IN entities AND right IN entities
        RETURN entities, collect(DISTINCT {
            source: left.id,
            target: right.id,
            relationship: type(relationship)
        }) AS edges
        """
        with GraphDatabase.driver(uri, auth=(username, password)) as driver:
            records, _, _ = driver.execute_query(
                query,
                agent_id=agent_id,
                database_=os.getenv("NEO4J_DATABASE", "neo4j"),
            )
        if not records:
            return {"provider": "neo4j", "data_disclosure": "No connected entities found.", "nodes": [], "edges": []}
        entities = records[0]["entities"]
        nodes = [
            {
                "id": entity.get("id", "unknown"),
                "label": entity.get("label", entity.get("id", "Unknown")),
                "kind": entity.get("kind", "agent"),
                "status": entity.get("status", "observed"),
            }
            for entity in entities
        ]
        edges = [edge for edge in records[0]["edges"] if edge.get("source") and edge.get("target")]
        return {
            "provider": "neo4j",
            "data_disclosure": "Relationships returned by the configured Neo4j database.",
            "nodes": nodes,
            "edges": edges,
        }
    except Exception:
        return None


def agent_network(agent_id: str) -> dict:
    return _neo4j_network(agent_id) or demo_network(agent_id)
