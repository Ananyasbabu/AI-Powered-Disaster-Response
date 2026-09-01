from app import db  # Adjust import if your SQLAlchemy db instance is defined elsewhere (e.g., app.extensions)

class Shelter(db.Model):
    __tablename__ = 'shelters'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    capacity = db.Column(db.Integer, nullable=True)

    def __repr__(self):
        return f"<Shelter {self.name}>"